// app/api/stock-opname/route.ts
import { NextRequest } from "next/server";
import { requireRole, requireUser } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { UserRole, StockOpnameStatus } from "@prisma/client";

/** GET /api/stock-opname - List stock opname sessions */
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const sessions = await prisma.stockOpname.findMany({
      where: status && (Object.values(StockOpnameStatus) as string[]).includes(status) ? { status: status as StockOpnameStatus } : undefined,
      include: { createdBy: { select: { id: true, fullName: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(sessions);
  } catch (error) {
    console.error("Get stock opname error:", error);
    return errorResponse("Failed to fetch stock opname");
  }
}

/** POST /api/stock-opname - Create a stock opname session + auto-generate items from all assets */
export async function POST(request: NextRequest) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const body = await request.json();
    const { title, frequency, startDate, notes } = body;
    if (!title || !frequency || !startDate) return errorResponse("Title, frequency, and start date are required", 400);

    const session = await prisma.$transaction(async (tx) => {
      const so = await tx.stockOpname.create({
        data: { title, frequency, startDate: new Date(startDate), notes: notes || null, createdById: user.userId, status: "IN_PROGRESS" },
      });
      // Auto-populate items from all active assets
      const assets = await tx.asset.findMany({ where: { status: { not: "DISPOSED" } }, select: { id: true, locationId: true, condition: true } });
      if (assets.length > 0) {
        await tx.stockOpnameItem.createMany({
          data: assets.map((a) => ({ stockOpnameId: so.id, assetId: a.id, expectedLocation: a.locationId, expectedCondition: a.condition })),
        });
      }
      return so;
    });
    const result = await prisma.stockOpname.findUnique({ where: { id: session.id }, include: { _count: { select: { items: true } } } });
    return successResponse(result, "Stock opname session created", 201);
  } catch (error) {
    console.error("Create stock opname error:", error);
    return errorResponse("Failed to create stock opname");
  }
}