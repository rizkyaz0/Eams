import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: {
        purchasePrice: true,
        purchaseDate: true,
        salvageValue: true,
        usefulLife: true,
        depreciationMethod: true,
      },
    });

    if (!asset) return notFoundResponse("Asset not found");

    if (!asset.usefulLife || asset.usefulLife <= 0 || !asset.purchasePrice) {
      return successResponse({
        isCalculable: false,
        message: "Asset does not have sufficient financial data (usefulLife or purchasePrice missing).",
      });
    }

    const purchasePrice = Number(asset.purchasePrice);
    const salvageValue = asset.salvageValue ? Number(asset.salvageValue) : 0;
    const usefulLifeMonths = asset.usefulLife;
    const purchaseDate = new Date(asset.purchaseDate);
    const currentDate = new Date();

    // Months since purchase
    let monthsElapsed = (currentDate.getFullYear() - purchaseDate.getFullYear()) * 12 + (currentDate.getMonth() - purchaseDate.getMonth());
    if (monthsElapsed < 0) monthsElapsed = 0;

    const cappedMonthsElapsed = Math.min(monthsElapsed, usefulLifeMonths);

    // Straight Line calculation
    const depreciableAmount = purchasePrice - salvageValue;
    const monthlyDepreciation = depreciableAmount / usefulLifeMonths;
    const accumulatedDepreciation = monthlyDepreciation * cappedMonthsElapsed;
    const currentBookValue = purchasePrice - accumulatedDepreciation;

    // Generate chart data points (yearly curve)
    const chartData = [];
    const numberOfYears = Math.ceil(usefulLifeMonths / 12);

    for (let year = 0; year <= numberOfYears; year++) {
      const yearDate = new Date(purchaseDate);
      yearDate.setFullYear(yearDate.getFullYear() + year);

      const yearMonthsElapsed = Math.min(year * 12, usefulLifeMonths);
      const yearBookValue = purchasePrice - monthlyDepreciation * yearMonthsElapsed;

      chartData.push({
        year: yearDate.getFullYear().toString(),
        bookValue: Math.round(yearBookValue),
        label: `Year ${year}`,
      });
    }

    return successResponse({
      isCalculable: true,
      metrics: {
        purchasePrice: Math.round(purchasePrice),
        salvageValue: Math.round(salvageValue),
        usefulLifeMonths,
        monthsElapsed: cappedMonthsElapsed,
        monthlyDepreciation: Math.round(monthlyDepreciation),
        accumulatedDepreciation: Math.round(accumulatedDepreciation),
        currentBookValue: Math.round(currentBookValue),
      },
      chartData,
    });
  } catch (error: any) {
    console.error("Finance calculation error:", error);
    return errorResponse(error.message || "Failed to calculate financial data", 500);
  }
}
