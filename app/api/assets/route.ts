// app/api/assets/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { AssetStatus, AssetCondition } from "@prisma/client";

/**
 * GET /api/assets - Get all assets with filters
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") as AssetStatus | null;
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [{ name: { contains: search, mode: "insensitive" } }, { tagNumber: { contains: search, mode: "insensitive" } }, { serialNumber: { contains: search, mode: "insensitive" } }];
    }

    // Get assets with pagination
    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          location: true,
          holder: {
            select: {
              id: true,
              fullName: true,
              email: true,
              nip: true,
            },
          },
          division: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.asset.count({ where }),
    ]);

    return successResponse({
      assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get assets error:", error);
    return errorResponse("Failed to fetch assets", 500);
  }
}

/**
 * POST /api/assets - Create new asset
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { name, tagNumber, serialNumber, specification, purchaseDate, purchasePrice, imagePath, categoryId, locationId, divisionId, status, condition, salvageValue, usefulLife, rfidData } = body;

    // Validation
    if (!name || !tagNumber || !purchaseDate || !purchasePrice || !categoryId) {
      return errorResponse("Name, tag number, purchase date, purchase price, and category are required", 400);
    }

    // Check if tag number already exists
    const existingAsset = await db.asset.findUnique({
      where: { tagNumber },
    });

    if (existingAsset) {
      return errorResponse("Asset with this tag number already exists", 409);
    }

    // Create asset
    const asset = await db.asset.create({
      data: {
        name,
        tagNumber,
        serialNumber: serialNumber || null,
        specification: specification || null,
        purchaseDate: new Date(purchaseDate),
        purchasePrice,
        imagePath: imagePath || null,
        categoryId,
        locationId: locationId || null,
        divisionId: divisionId || null,
        status: (status as AssetStatus) || AssetStatus.AVAILABLE,
        condition: (condition as AssetCondition) || AssetCondition.GOOD,
        salvageValue: salvageValue || null,
        usefulLife: usefulLife || null,
        rfidData: rfidData || null,
      },
      include: {
        category: true,
        location: true,
        division: true,
      },
    });

    return successResponse(asset, "Asset created successfully", 201);
  } catch (error) {
    console.error("Create asset error:", error);
    return errorResponse("Failed to create asset", 500);
  }
}
