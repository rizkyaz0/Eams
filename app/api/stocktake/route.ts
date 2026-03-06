import { NextRequest } from "next/server"; // Touch for TS refresh
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const page = parseInt(searchParams.get("page") || "1");

    const stockTakes = await prisma.stockTake.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        auditor: { select: { fullName: true } },
        _count: { select: { details: true } },
      },
    });

    const total = await prisma.stockTake.count();

    return successResponse({
      stockTakes,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch stock takes");
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN_INSTANSI")) {
    return unauthorizedResponse("Only Admins or Managers can initiate a Stock Take");
  }

  try {
    const body = await request.json();
    const { title, auditorId, locationId, categoryId } = body;

    if (!title || !auditorId) {
      return errorResponse("Title and Auditor ID are required", 400);
    }

    // Determine target assets based on filters
    const whereClause: any = { status: { not: "DISPOSED" } };
    if (locationId) whereClause.locationId = locationId;
    if (categoryId) whereClause.categoryId = categoryId;

    const targetAssets = await prisma.asset.findMany({
      where: whereClause,
      select: { id: true, condition: true },
    });

    if (targetAssets.length === 0) {
      return errorResponse("No assets match the specified filters to be audited.", 404);
    }

    // Create StockTake and its details
    const result = await prisma.$transaction(async (tx) => {
      const stockTake = await tx.stockTake.create({
        data: {
          title,
          auditorId,
          startDate: new Date(),
          status: "OPEN",
          details: {
            create: targetAssets.map((asset) => ({
              assetId: asset.id,
              countedQty: 0,
              // Initially variance is -1 (missing) because we expect 1 per asset by default
              variance: -1,
            })),
          },
        },
      });
      return stockTake;
    });

    return successResponse(result, "Stock Take initiated successfully");
  } catch (error: any) {
    console.error("Stock Take Creation Error:", error);
    return errorResponse(error.message || "Failed to create Stock Take");
  }
}
