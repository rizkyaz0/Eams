"use client";

import { useId } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface DashboardChartsProps {
  data?: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  monthlyData?: Array<{
    month: string;
    label: string;
    count: number;
  }>;
}

export function DashboardCharts({ data, monthlyData }: DashboardChartsProps) {
  const gradientId = useId().replace(/:/g, "");

  const hasCategoryData = !!data && data.length > 0;
  const hasMonthlyData = !!monthlyData && monthlyData.length > 0;

  const categoryChartData = (data ?? []).map((item) => ({
    name: item.name,
    count: item.count,
  }));

  const monthlyChartData = (monthlyData ?? []).map((item) => ({
    label: item.label,
    count: item.count,
  }));

  const categoryConfig = {
    count: {
      label: "Aset",
      color: "hsl(var(--chart-1))",
    },
  };

  const monthlyConfig = {
    count: {
      label: "Aset",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Aset per Kategori</CardTitle>
          <CardDescription>
            {hasCategoryData
              ? `Distribusi ${data.reduce((sum, item) => sum + item.count, 0)} aset per kategori`
              : "Belum ada data"}
          </CardDescription>
        </CardHeader>
        {hasCategoryData && (
          <CardContent>
            <ChartContainer config={categoryConfig} className="h-[280px] w-full">
              <BarChart data={categoryChartData} margin={{ right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Tren Pengadaan Aset (6 Bulan Terakhir)</CardTitle>
          <CardDescription>{hasMonthlyData ? "Jumlah aset baru per bulan" : "Belum ada data"}</CardDescription>
        </CardHeader>
        {hasMonthlyData && (
          <CardContent>
            <ChartContainer config={monthlyConfig} className="h-[280px] w-full">
              <AreaChart data={monthlyChartData} margin={{ right: 16 }}>
                <defs>
                  <linearGradient id={`fillCount-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  fill={`url(#fillCount-${gradientId})`}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        )}
      </Card>
    </div>
  );
}