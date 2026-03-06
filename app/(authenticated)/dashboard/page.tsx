"use client";

import { useEffect, useState } from "react";
import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardCharts } from "@/components/dashboard-charts";
import { RecentBast } from "@/components/recent-bast";
import { AIPredictiveAlerts } from "@/components/ai-predictive-alerts";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : (
            <>
              <DashboardStats data={dashboardData?.assetStatistics} />
              <div className="px-4 lg:px-6">
                <DashboardCharts data={dashboardData?.assetsByCategory} />
              </div>
              {dashboardData?.aiPredictions && dashboardData.aiPredictions.length > 0 && (
                <div className="px-4 lg:px-6">
                  <AIPredictiveAlerts predictions={dashboardData.aiPredictions} />
                </div>
              )}
              <RecentBast data={dashboardData?.recentBasts} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
