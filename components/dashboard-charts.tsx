"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface DashboardChartsProps {
  data?: Array<{
    id: string;
    name: string;
    count: number;
  }>;
}

const chartConfig = {
  count: {
    label: "Assets",
    // Kamu bisa menggunakan warna dari tema shadcn seperti chart-1, chart-2, dst.
    // Atau tetap mempertahankan primary color-mu: "hsl(var(--primary))"
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function DashboardCharts({ data }: DashboardChartsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assets by Category</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Formatting data
  const chartData = data.map((item) => ({
    name: item.name,
    count: item.count,
  }));

  // Menghitung total untuk ditampilkan di Footer
  const totalAssets = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets by Category</CardTitle>
        <CardDescription>Distribution overview</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              // Jika nama kategorinya panjang, kamu bisa memotongnya seperti ini:
              // tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            {/* Radius 8 memberikan efek rounded penuh di atas dan bawah bar */}
            <Bar dataKey="count" fill="var(--color-count)" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Total {totalAssets} assets in the system <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">Showing distribution across all registered categories</div>
      </CardFooter>
    </Card>
  );
}
