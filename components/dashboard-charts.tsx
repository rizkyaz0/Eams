"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface DashboardChartsProps {
  data?: Array<{
    id: string;
    name: string;
    count: number;
  }>;
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aset per Kategori</CardTitle>
          <CardDescription>Belum ada data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: item.name,
    count: item.count,
  }));

  const chartConfig = {
    count: {
      label: "Aset",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aset per Kategori</CardTitle>
        <CardDescription>Distribusi {data.reduce((sum, item) => sum + item.count, 0)} aset across kategori</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
