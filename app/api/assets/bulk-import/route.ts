// app/api/assets/bulk-import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { AssetCondition, AssetStatus, Prisma, UserRole } from "@prisma/client";

/**
 * POST /api/assets/bulk-import - Bulk import assets from CSV-parsed JSON array.
 * Expects body: { assets: [{ name, tagNumber, serialNumber?, specification?, categoryId, locationId?, divisionId?, purchaseDate, purchasePrice, vendorName?, warrantyExpiry?, condition? }] }
 * Validates each row, resolves category by name (fallback to id), checks tagNumber uniqueness, inserts in a transaction.
 */
export async function POST(request: NextRequest) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const body = await request.json();
    const rows: any[] = body.assets;

    if (!Array.isArray(rows) || rows.length === 0) {
      return errorResponse("No asset data provided", 400);
    }

    if (rows.length > 500) {
      return errorResponse("Maximum 500 assets per import", 400);
    }

    // Pre-fetch all categories and locations for name→id resolution
    const [categories, locations, divisions] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.location.findMany({ select: { id: true, name: true } }),
      prisma.division.findMany({ select: { id: true, name: true } }),
    ]);

    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const categoryById = new Map(categories.map((c) => [c.id, c.id]));
    const locationByName = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));
    const locationById = new Map(locations.map((l) => [l.id, l.id]));
    const divisionByName = new Map(divisions.map((d) => [d.name.toLowerCase(), d.id]));
    const divisionById = new Map(divisions.map((d) => [d.id, d.id]));

    // Validate all rows first
    const errors: { row: number; message: string }[] = [];
    const validRows: any[] = [];
    const seenTagNumbers = new Set<string>();

    // Pre-fetch existing tag numbers for batch uniqueness check
    const tagNumbers = rows.map((r) => r.tagNumber).filter(Boolean);
    const existingTags = await prisma.asset.findMany({
      where: { tagNumber: { in: tagNumbers } },
      select: { tagNumber: true },
    });
    const existingTagSet = new Set(existingTags.map((a) => a.tagNumber));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is CSV header

      if (!row.name || !row.name.trim()) {
        errors.push({ row: rowNum, message: "Name is required" });
        continue;
      }
      if (!row.tagNumber || !row.tagNumber.trim()) {
        errors.push({ row: rowNum, message: "Tag Number is required" });
        continue;
      }
      if (!row.purchaseDate) {
        errors.push({ row: rowNum, message: "Purchase Date is required" });
        continue;
      }
      if (!row.purchasePrice && row.purchasePrice !== 0) {
        errors.push({ row: rowNum, message: "Purchase Price is required" });
        continue;
      }

      // Check tagNumber uniqueness within the import batch
      const tagLower = row.tagNumber.trim();
      if (seenTagNumbers.has(tagLower)) {
        errors.push({ row: rowNum, message: `Duplicate tag number "${tagLower}" within import` });
        continue;
      }
      seenTagNumbers.add(tagLower);

      // Check tagNumber uniqueness against DB
      if (existingTagSet.has(tagLower)) {
        errors.push({ row: rowNum, message: `Tag number "${tagLower}" already exists` });
        continue;
      }

      // Resolve category
      let categoryId: string | null = null;
      if (row.category) {
        categoryId = categoryByName.get(row.category.toLowerCase()) || categoryById.get(row.category) || null;
        if (!categoryId) {
          errors.push({ row: rowNum, message: `Category "${row.category}" not found` });
          continue;
        }
      } else if (row.categoryId) {
        categoryId = categoryById.get(row.categoryId) || null;
        if (!categoryId) {
          errors.push({ row: rowNum, message: `Category ID "${row.categoryId}" not found` });
          continue;
        }
      }

      if (!categoryId) {
        errors.push({ row: rowNum, message: "Category is required" });
        continue;
      }

      // Resolve location (optional)
      let locationId: string | null = null;
      if (row.location) {
        locationId = locationByName.get(row.location.toLowerCase()) || locationById.get(row.location) || null;
        if (!locationId) {
          errors.push({ row: rowNum, message: `Location "${row.location}" not found` });
          continue;
        }
      } else if (row.locationId) {
        locationId = locationById.get(row.locationId) || null;
      }

      // Resolve division (optional)
      let divisionId: string | null = null;
      if (row.division) {
        divisionId = divisionByName.get(row.division.toLowerCase()) || divisionById.get(row.division) || null;
        if (!divisionId) {
          errors.push({ row: rowNum, message: `Division "${row.division}" not found` });
          continue;
        }
      } else if (row.divisionId) {
        divisionId = divisionById.get(row.divisionId) || null;
      }

      // Parse condition
      let condition: AssetCondition = AssetCondition.GOOD;
      if (row.condition) {
        const condUpper = row.condition.toUpperCase().replace(/ /g, "_");
        if (Object.values(AssetCondition).includes(condUpper as AssetCondition)) {
          condition = condUpper as AssetCondition;
        }
      }

      // Parse dates
      let purchaseDate: Date;
      try {
        purchaseDate = new Date(row.purchaseDate);
        if (isNaN(purchaseDate.getTime())) throw new Error();
      } catch {
        errors.push({ row: rowNum, message: "Invalid purchase date format" });
        continue;
      }

      let warrantyExpiry: Date | null = null;
      if (row.warrantyExpiry) {
        try {
          warrantyExpiry = new Date(row.warrantyExpiry);
          if (isNaN(warrantyExpiry.getTime())) throw new Error();
        } catch {
          errors.push({ row: rowNum, message: "Invalid warranty expiry date format" });
          continue;
        }
      }

      // Parse price
      let purchasePrice: number;
      try {
        purchasePrice = parseFloat(String(row.purchasePrice).replace(/[^0-9.-]/g, ""));
        if (isNaN(purchasePrice) || purchasePrice < 0) throw new Error();
      } catch {
        errors.push({ row: rowNum, message: "Invalid purchase price" });
        continue;
      }

      validRows.push({
        name: row.name.trim(),
        tagNumber: tagLower,
        serialNumber: row.serialNumber?.trim() || null,
        specification: row.specification?.trim() || null,
        description: row.description?.trim() || null,
        categoryId,
        locationId,
        divisionId,
        purchaseDate,
        purchasePrice,
        vendorName: row.vendorName?.trim() || null,
        warrantyExpiry,
        condition,
        status: AssetStatus.AVAILABLE,
      });
    }

    // If there are validation errors, return them without importing
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: "Validation errors found", data: errors },
        { status: 400 }
      );
    }

    // Insert all valid rows in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const created: any[] = [];
      for (const row of validRows) {
        const asset = await tx.asset.create({
          data: {
            name: row.name,
            tagNumber: row.tagNumber,
            serialNumber: row.serialNumber,
            specification: row.specification,
            description: row.description,
            categoryId: row.categoryId,
            locationId: row.locationId,
            divisionId: row.divisionId,
            purchaseDate: row.purchaseDate,
            purchasePrice: row.purchasePrice,
            vendorName: row.vendorName,
            warrantyExpiry: row.warrantyExpiry,
            condition: row.condition,
            status: row.status,
          },
        });
        created.push({ id: asset.id, tagNumber: asset.tagNumber, name: asset.name });
      }
      return created;
    });

    return successResponse(
      { imported: result.length, assets: result, errors: [] },
      `Successfully imported ${result.length} assets`
    );
  } catch (error) {
    console.error("Bulk import error:", error);
    return errorResponse("Failed to import assets", 500);
  }
}

/**
 * GET /api/assets/bulk-import - Download CSV template
 */
export async function GET(request: NextRequest) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  const header = "name,tagNumber,serialNumber,specification,category,location,division,purchaseDate,purchasePrice,vendorName,warrantyExpiry,condition,description";
  const example = '"Laptop Dell Latitude 5440","IT-LP-001","SN123456","Intel i7, 16GB RAM, 512GB SSD","Elektronik","Ruang Server","IT","2024-01-15","15000000","Dell Indonesia","2027-01-15","GOOD","Laptop untuk staff IT"';

  const csv = `${header}\n${example}\n`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="asset-import-template.csv"',
    },
  });
}