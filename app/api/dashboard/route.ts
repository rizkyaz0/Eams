// app/api/dashboard/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { AssetStatus } from "@prisma/client";

/**
 * GET /api/dashboard - Get dashboard statistics
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      assetsByStatus,
      assetsByCategory,
      recentBasts,
      maintenanceAlerts,
      usersByRole,
      assetValues,
      recentAssets,
      recentMaintenance,
      recentBastsActivity,
      openDamageReports,
      activeLoanBatches,
      warrantyExpiringSoon,
      sixMonthAssets,
    ] = await Promise.all([
      db.asset.groupBy({ by: ["status"], _count: true }),
      db.category.findMany({
        select: { id: true, name: true, _count: { select: { assets: true } } },
        orderBy: { name: "asc" },
      }),
      db.bast.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          creator: { select: { fullName: true } },
          _count: { select: { details: true } },
        },
      }),
      db.asset.findMany({
        where: { status: AssetStatus.IN_MAINTENANCE },
        include: {
          category: true,
          location: true,
          maintenances: {
            where: { status: "IN_PROGRESS" },
            orderBy: { startDate: "desc" },
            take: 1,
          },
        },
        take: 10,
      }),
      db.user.groupBy({ by: ["role"], _count: true }),
      db.asset.aggregate({
        _sum: { purchasePrice: true },
        _avg: { purchasePrice: true },
        where: { status: { not: AssetStatus.DISPOSED } },
      }),
      db.asset.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.maintenance.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { asset: { select: { name: true } } },
      }),
      db.bast.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { creator: { select: { fullName: true } } },
      }),
      db.assetDamageReport.count({ where: { status: "OPEN" } }),
      db.assetLoanBatch.count({ where: { status: "ACTIVE" } }),
      db.asset.findMany({
        where: {
          warrantyExpiry: { gte: now, lte: thirtyDaysFromNow },
          status: { not: AssetStatus.DISPOSED },
        },
        select: {
          id: true,
          name: true,
          tagNumber: true,
          warrantyExpiry: true,
          category: { select: { name: true } },
        },
        orderBy: { warrantyExpiry: "asc" },
        take: 10,
      }),
      db.asset.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
    ]);

    // Build status counts including BORROWED
    const statusCounts = {
      total: 0,
      available: 0,
      inUse: 0,
      inMaintenance: 0,
      borrowed: 0,
      missing: 0,
      disposed: 0,
    };
    assetsByStatus.forEach((item) => {
      statusCounts.total += item._count;
      switch (item.status) {
        case AssetStatus.AVAILABLE: statusCounts.available = item._count; break;
        case AssetStatus.IN_USE: statusCounts.inUse = item._count; break;
        case AssetStatus.IN_MAINTENANCE: statusCounts.inMaintenance = item._count; break;
        case AssetStatus.BORROWED: statusCounts.borrowed = item._count; break;
        case AssetStatus.MISSING: statusCounts.missing = item._count; break;
        case AssetStatus.DISPOSED: statusCounts.disposed = item._count; break;
      }
    });

    // Monthly acquisitions — last 6 months, grouped by month
    const monthlyMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = 0;
    }
    sixMonthAssets.forEach((a) => {
      const d = new Date(a.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthlyMap) monthlyMap[key]++;
    });
    const monthlyAcquisitions = Object.entries(monthlyMap).map(([month, count]) => {
      const [year, m] = month.split("-");
      const label = new Date(parseInt(year), parseInt(m) - 1, 1).toLocaleDateString("id-ID", {
        month: "short",
        year: "2-digit",
      });
      return { month, label, count };
    });

    // Activity feed
    const recentActivities = [
      ...recentMaintenance.map((m) => ({
        id: m.id,
        type: "MAINTENANCE" as const,
        title: `Maintenance ${m.status.toLowerCase()} — ${m.asset.name}`,
        user: "Sistem",
        date: m.updatedAt,
      })),
      ...recentBastsActivity.map((b) => ({
        id: b.id,
        type: "BAST" as const,
        title: `BAST dibuat: ${b.bastNumber}`,
        user: b.creator.fullName,
        date: b.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return successResponse({
      recentActivities,
      assetStatistics: {
        ...statusCounts,
        valueStats: {
          totalValue: assetValues._sum.purchasePrice || 0,
          averageValue: assetValues._avg.purchasePrice || 0,
        },
        recentAdditions: recentAssets,
        openDamageReports,
        activeLoanBatches,
      },
      assetsByCategory: assetsByCategory.map((cat) => ({
        id: cat.id,
        name: cat.name,
        count: cat._count.assets,
      })),
      recentBasts: recentBasts.map((bast) => ({
        id: bast.id,
        bastNumber: bast.bastNumber,
        type: bast.type,
        status: bast.status,
        creatorName: bast.creator.fullName,
        assetCount: bast._count.details,
        createdAt: bast.createdAt,
      })),
      maintenanceAlerts: maintenanceAlerts.map((asset) => ({
        id: asset.id,
        name: asset.name,
        tagNumber: asset.tagNumber,
        category: asset.category.name,
        location: asset.location?.name,
        maintenance: asset.maintenances[0] || null,
      })),
      userStatistics: usersByRole.map((item) => ({ role: item.role, count: item._count })),
      warrantyExpiringSoon,
      monthlyAcquisitions,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    return errorResponse("Failed to fetch dashboard data", 500);
  }
}
