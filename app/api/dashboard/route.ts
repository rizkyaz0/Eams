// app/api/dashboard/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { AssetStatus } from "@prisma/client";

/**
 * GET /api/dashboard - Get dashboard statistics
 * OPTIMIZED: All queries run in parallel via Promise.all() instead of sequentially
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // ✅ PERFORMANCE: Run all 8 independent DB queries in parallel.
    // Previously these ran sequentially (7+ round trips). Now: 1 round trip.
    const [assetsByStatus, assetsByCategory, recentBasts, maintenanceAlerts, aiPredictions, usersByRole, assetValues, recentAssets, recentMaintenance, recentBastsRaw] = await Promise.all([
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
          maintenances: { where: { status: "IN_PROGRESS" }, orderBy: { startDate: "desc" }, take: 1 },
        },
        take: 10,
      }),

      db.maintenancePrediction.findMany({
        take: 5,
        orderBy: { predictedFailureDate: "asc" },
        where: { predictedFailureDate: { gte: new Date() } },
        include: {
          asset: { select: { name: true, tagNumber: true, category: { select: { name: true } } } },
        },
      }),

      db.user.groupBy({ by: ["role"], _count: true }),

      db.asset.aggregate({
        _sum: { purchasePrice: true },
        _avg: { purchasePrice: true },
        where: { status: { not: AssetStatus.DISPOSED } },
      }),

      db.asset.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

      db.maintenance.findMany({ take: 5, orderBy: { updatedAt: "desc" }, include: { asset: true } }),

      db.bast.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { creator: true } }),
    ]);

    // Compute status counts from grouped results
    const statusCounts = { total: 0, available: 0, inUse: 0, inMaintenance: 0, missing: 0, disposed: 0 };
    assetsByStatus.forEach((item) => {
      statusCounts.total += item._count;
      switch (item.status) {
        case AssetStatus.AVAILABLE:
          statusCounts.available = item._count;
          break;
        case AssetStatus.IN_USE:
          statusCounts.inUse = item._count;
          break;
        case AssetStatus.IN_MAINTENANCE:
          statusCounts.inMaintenance = item._count;
          break;
        case AssetStatus.MISSING:
          statusCounts.missing = item._count;
          break;
        case AssetStatus.DISPOSED:
          statusCounts.disposed = item._count;
          break;
      }
    });

    const recentActivities = [
      ...recentMaintenance.map((m) => ({
        id: m.id,
        type: "MAINTENANCE",
        title: `${m.status} maintenance for ${m.asset.name}`,
        user: "System",
        date: m.updatedAt,
      })),
      ...recentBastsRaw.map((b) => ({
        id: b.id,
        type: "BAST",
        title: `BAST Created: ${b.bastNumber}`,
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
      aiPredictions: aiPredictions.map((p) => ({
        id: p.id,
        assetId: p.assetId,
        assetName: p.asset.name,
        tagNumber: p.asset.tagNumber,
        categoryName: p.asset.category.name,
        predictedFailureDate: p.predictedFailureDate,
        confidenceScore: p.confidenceScore,
      })),
      userStatistics: usersByRole.map((item) => ({
        role: item.role,
        count: item._count,
      })),
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    return errorResponse("Failed to fetch dashboard data", 500);
  }
}
