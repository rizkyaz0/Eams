import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Tersedia",
  IN_USE: "Digunakan",
  IN_MAINTENANCE: "Pemeliharaan",
  BORROWED: "Dipinjam",
  MISSING: "Hilang",
  DISPOSED: "Disposal",
};

const CONDITION_LABELS: Record<string, string> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Rusak Ringan",
  MAJOR_DAMAGE: "Rusak Berat",
  TOTAL_LOSS: "Total Loss",
};

/** GET /api/reports - Aggregated report data */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      statusGroupsRaw,
      conditionGroupsRaw,
      categoryGroupsRaw,
      divisionGroupsRaw,
      maintenanceStats,
      loanStats,
      damageStats,
      warrantyExpiring,
    ] = await Promise.all([
      // Status distribution
      prisma.asset.groupBy({ by: ["status"], _count: { id: true } }),

      // Condition distribution
      prisma.asset.groupBy({ by: ["condition"], _count: { id: true } }),

      // Top 5 categories
      prisma.asset.groupBy({
        by: ["categoryId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),

      // Assets per division
      prisma.asset.groupBy({
        by: ["divisionId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // Maintenance stats
      prisma.$transaction([
        prisma.maintenance.count({ where: { status: "IN_PROGRESS" } }),
        prisma.maintenance.count({ where: { status: "PENDING" } }),
        prisma.maintenance.aggregate({ _sum: { cost: true } }),
      ]),

      // Loan stats
      prisma.$transaction([
        prisma.assetLoanBatch.count({ where: { status: "ACTIVE" } }),
        prisma.assetLoanItem.count({ where: { status: "ACTIVE" } }),
        prisma.assetLoanItem.count({ where: { status: "OVERDUE" } }),
      ]),

      // Damage report stats
      prisma.$transaction([
        prisma.assetDamageReport.count({ where: { status: "OPEN" } }),
        prisma.assetDamageReport.count({ where: { status: "IN_PROGRESS" } }),
        prisma.assetDamageReport.count({ where: { status: "RESOLVED" } }),
      ]),

      // Assets with warranty expiring in 30 days
      prisma.asset.findMany({
        where: {
          warrantyExpiry: { gte: now, lte: thirtyDaysFromNow },
          status: { notIn: ["DISPOSED"] },
        },
        select: {
          id: true,
          name: true,
          tagNumber: true,
          warrantyExpiry: true,
          status: true,
          category: { select: { name: true } },
          division: { select: { name: true } },
        },
        orderBy: { warrantyExpiry: "asc" },
        take: 20,
      }),
    ]);

    // Category names lookup
    const categoryIds = categoryGroupsRaw.map((g) => g.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    // Division names lookup
    const divisionIds = divisionGroupsRaw.map((g) => g.divisionId).filter(Boolean) as string[];
    const divisions = await prisma.division.findMany({
      where: { id: { in: divisionIds } },
      select: { id: true, name: true },
    });

    const statusData = statusGroupsRaw.map((g) => ({
      name: STATUS_LABELS[g.status] ?? g.status,
      value: g._count.id,
    }));

    const conditionData = conditionGroupsRaw.map((g) => ({
      name: CONDITION_LABELS[g.condition] ?? g.condition,
      value: g._count.id,
    }));

    const categoryData = categoryGroupsRaw.map((g) => ({
      name: categories.find((c) => c.id === g.categoryId)?.name ?? "Lainnya",
      value: g._count.id,
    }));

    const divisionData = divisionGroupsRaw.map((g) => ({
      name: g.divisionId
        ? (divisions.find((d) => d.id === g.divisionId)?.name ?? "Tidak Diketahui")
        : "Tanpa Divisi",
      value: g._count.id,
    }));

    const [maintenanceActive, maintenancePending, maintenanceCostAgg] = maintenanceStats;
    const [loanActiveBatches, loanActiveItems, loanOverdueItems] = loanStats;
    const [damageOpen, damageInProgress, damageResolved] = damageStats;

    return successResponse({
      totalAssets: statusData.reduce((acc, curr) => acc + curr.value, 0),
      statusData,
      conditionData,
      categoryData,
      divisionData,
      maintenance: {
        active: maintenanceActive,
        pending: maintenancePending,
        totalCost: Number(maintenanceCostAgg._sum.cost ?? 0),
      },
      loans: {
        activeBatches: loanActiveBatches,
        activeItems: loanActiveItems,
        overdueItems: loanOverdueItems,
      },
      damage: {
        open: damageOpen,
        inProgress: damageInProgress,
        resolved: damageResolved,
      },
      warrantyExpiring,
    });
  } catch (error: any) {
    console.error("Failed to generate report data", error);
    return errorResponse("Failed to fetch reports", 500);
  }
}
