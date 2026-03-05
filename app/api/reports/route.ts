import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    // Basic aggregation for Asset Statuses
    const statusGroupsRaw = await prisma.asset.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    const statusData = statusGroupsRaw.map((g) => ({
      name: g.status,
      value: g._count.id,
    }));

    // Basic aggregation for Asset Conditions
    const conditionGroupsRaw = await prisma.asset.groupBy({
      by: ["condition"],
      _count: {
        id: true,
      },
    });

    const conditionData = conditionGroupsRaw.map((g) => ({
      name: g.condition,
      value: g._count.id,
    }));

    // Asset counts per Category (Top 5)
    const categoryGroupsRaw = await prisma.asset.groupBy({
      by: ["categoryId"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    // We need to fetch the actual category names since groupBy only returns the ID
    const categoryIds = categoryGroupsRaw.map((g) => g.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryData = categoryGroupsRaw.map((g) => {
      const catName = categories.find((c) => c.id === g.categoryId)?.name || "Unknown";
      return {
        name: catName,
        value: g._count.id,
      };
    });

    return successResponse({
      statusData,
      conditionData,
      categoryData,
      totalAssets: statusData.reduce((acc, curr) => acc + curr.value, 0),
    });
  } catch (error: any) {
    console.error("Failed to generate report data", error);
    return errorResponse("Failed to fetch reports", 500);
  }
}
