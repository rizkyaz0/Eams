// app/api/maintenance/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

/**
 * GET /api/maintenance - Get all maintenance records
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
    const assetId = searchParams.get("assetId");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (assetId) {
      where.assetId = assetId;
    }

    if (status) {
      where.status = status;
    }

    // Get maintenance records with pagination
    const [maintenances, total] = await Promise.all([
      db.maintenance.findMany({
        where,
        skip,
        take: limit,
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              tagNumber: true,
              category: true,
            },
          },
        },
        orderBy: {
          startDate: "desc",
        },
      }),
      db.maintenance.count({ where }),
    ]);

    return successResponse({
      maintenances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get maintenance error:", error);
    return errorResponse("Failed to fetch maintenance records", 500);
  }
}

/**
 * POST /api/maintenance - Create new maintenance record
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { assetId, description, cost, vendorName, startDate, endDate, status } = body;

    // Validation
    if (!assetId || !description || !startDate) {
      return errorResponse("Asset ID, description, and start date are required", 400);
    }

    // Check if asset exists
    const asset = await db.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return errorResponse("Asset not found", 404);
    }

    // Create maintenance record and update asset status in transaction
    const maintenance = await db.$transaction(async (tx) => {
      // Create maintenance record
      const newMaintenance = await tx.maintenance.create({
        data: {
          assetId,
          description,
          cost: cost || null,
          vendorName: vendorName || null,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          status: status || "PENDING",
        },
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              tagNumber: true,
            },
          },
        },
      });

      // Update asset status to IN_MAINTENANCE if maintenance is IN_PROGRESS
      if (status === "IN_PROGRESS") {
        await tx.asset.update({
          where: { id: assetId },
          data: {
            status: "IN_MAINTENANCE",
          },
        });
      }

      return newMaintenance;
    });

    return successResponse(maintenance, "Maintenance record created successfully", 201);
  } catch (error) {
    console.error("Create maintenance error:", error);
    return errorResponse("Failed to create maintenance record", 500);
  }
}
