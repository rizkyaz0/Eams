import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const stockTake = await prisma.stockTake.findUnique({
      where: { id },
      include: {
        auditor: { select: { fullName: true } },
        details: {
          include: {
            asset: {
              select: { id: true, name: true, tagNumber: true, status: true },
            },
          },
        },
      },
    });

    if (!stockTake) return notFoundResponse();

    return successResponse(stockTake);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch stock take details");
  }
}

// POST is for Submitting the counted items and reconciling.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { audits } = body; // Array of { detailId, assetId, countedQty, condition, notes }

    if (!Array.isArray(audits)) return errorResponse("Invalid audits payload", 400);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check stocktake
      const stockTake = await tx.stockTake.findUnique({ where: { id } });
      if (!stockTake) throw new Error("Stock Take not found");
      if (stockTake.status !== "OPEN") throw new Error("Stock Take is already closed");

      // 2. Loop through submitted audits to calculate variance
      for (const audit of audits) {
        // We EXPECT 1 physical item per asset record
        // If countedQty is 0, variance is -1 (missing)
        // If countedQty is 1, variance is 0 (matched)
        const expectedQty = 1;
        const variance = audit.countedQty - expectedQty;

        await tx.stockTakeDetail.update({
          where: { id: audit.detailId },
          data: {
            countedQty: audit.countedQty,
            variance,
            condition: audit.condition,
            notes: audit.notes,
          },
        });

        // 3. Create Automated Alerts for MISSING assets
        if (variance < 0) {
          await tx.assetAlert.create({
            data: {
              assetId: audit.assetId,
              type: "STOCK_MISSING",
              description: `Sistem Opname Otomatis [${stockTake.title}]: Aset terpindai hilang secara fisik (Missing).`,
            },
          });

          // Optional: Flag asset status to MISSING
          await tx.asset.update({
            where: { id: audit.assetId },
            data: { status: "MISSING" },
          });
        }
      }

      // Close Stock Take
      const updatedStockTake = await tx.stockTake.update({
        where: { id },
        data: {
          status: "RECONCILED",
          endDate: new Date(),
        },
      });

      return updatedStockTake;
    });

    return successResponse(result, "Data rekonsiliasi tersimpan utuh dan Opname berhasil ditutup.");
  } catch (error: any) {
    console.error("Reconciliation Error:", error);
    return errorResponse(error.message || "Failed to reconcile stock take", 500);
  }
}
