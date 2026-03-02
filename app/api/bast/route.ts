// app/api/bast/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { BastType } from "@prisma/client";

/**
 * GET /api/bast - Get all BAST with filters and pagination
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
    const type = searchParams.get("type") as BastType | null;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [{ bastNumber: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }];
    }

    // Get BAST with pagination
    const [basts, total] = await Promise.all([
      db.bast.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
              nip: true,
            },
          },
          approver: {
            select: {
              id: true,
              fullName: true,
              email: true,
              nip: true,
            },
          },
          _count: {
            select: {
              details: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.bast.count({ where }),
    ]);

    return successResponse({
      basts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get BAST error:", error);
    return errorResponse("Failed to fetch BAST", 500);
  }
}

/**
 * POST /api/bast - Create new BAST with details
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { type, recipientName, recipientPosition, notes, items } = body;

    // Validation
    if (!type || !recipientName) {
      return errorResponse("Type and recipient name are required", 400);
    }

    if (!items || items.length === 0) {
      return errorResponse("At least one asset is required", 400);
    }

    // Auto-generate BAST number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    // Count existing BAsts this month to generate sequential number
    const existingCount = await db.bast.count({
      where: {
        createdAt: {
          gte: new Date(year, date.getMonth(), 1),
          lt: new Date(year, date.getMonth() + 1, 1),
        },
      },
    });

    const bastNumber = `BAST/${year}/${month}/${String(existingCount + 1).padStart(4, "0")}`;

    // Create BAST with details in transaction
    const bast = await db.$transaction(async (tx) => {
      // Create BAST
      const newBast = await tx.bast.create({
        data: {
          bastNumber,
          type: type as BastType,
          description: notes || null,
          recipientName,
          recipientPosition: recipientPosition || null,
          effectiveDate: new Date(),
          creatorId: user.userId,
          status: "PENDING", // Changed from DRAFT to PENDING
        },
      });

      // Create BAST details
      await Promise.all(
        items.map((item: any) =>
          tx.bastDetail.create({
            data: {
              bastId: newBast.id,
              assetId: item.assetId,
              conditionBefore: "GOOD", // Default value
              conditionAfter: "GOOD", // Default value
              targetLocationId: null,
              targetHolderId: null,
              description: null,
            },
          }),
        ),
      );

      return newBast;
    });

    // Fetch complete BAST data
    const completeBast = await db.bast.findUnique({
      where: { id: bast.id },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        details: {
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
        },
      },
    });

    return successResponse(completeBast, "BAST created successfully", 201);
  } catch (error) {
    console.error("Create BAST error:", error);
    return errorResponse("Failed to create BAST", 500);
  }
}
