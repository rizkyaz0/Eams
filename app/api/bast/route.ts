// app/api/bast/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { requireRole } from "@/lib/security";
import { createBastService, type CreateBastInput } from "@/lib/services/bast-service";
import { BastType, AssetCondition, UserRole } from "@prisma/client";

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

    // MR can only see BAST involving their division's assets
    if (user.role === UserRole.MR) {
      const divisionId = user.divisionId ?? "NO_DIVISION_ASSIGNED";
      where.details = { some: { asset: { divisionId } } };
    }

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
 * POST /api/bast - Create new BAST with details (thin adapter over bast-service)
 */
export async function POST(request: NextRequest) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

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

    // Map REST body onto the shared service input (BUG-02)
    const input: CreateBastInput = {
      type: type as BastType,
      recipientName,
      recipientPosition: recipientPosition || undefined,
      description: notes || undefined,
      items: items.map(
        (item: {
          assetId: string;
          conditionBefore?: AssetCondition;
          conditionAfter?: AssetCondition;
          targetLocationId?: string;
          targetHolderId?: string;
          description?: string;
        }) => ({
          assetId: item.assetId,
          conditionBefore: item.conditionBefore,
          conditionAfter: item.conditionAfter || AssetCondition.GOOD,
          targetLocationId: item.targetLocationId,
          targetHolderId: item.targetHolderId,
          description: item.description,
        }),
      ),
    };

    const bast = await createBastService(input, user);

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
