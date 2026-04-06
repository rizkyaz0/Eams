"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

// Palet warna standar yang akan digunakan jika tidak menggunakan tema khusus
const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--primary))"];

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load reports API data", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-10 w-full max-w-7xl mx-auto">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-10 text-center text-muted-foreground">Data not available</div>;

  // Konfigurasi dinamis untuk ChartContainer shadcn
  const statusConfig = data.statusData.reduce((acc: any, item: any, i: number) => {
    acc[item.name] = { label: item.name, color: COLORS[i % COLORS.length] };
    return acc;
  }, {});

  const conditionConfig = data.conditionData.reduce((acc: any, item: any, i: number) => {
    acc[item.name] = { label: item.name, color: COLORS[(i + 2) % COLORS.length] };
    return acc;
  }, {});

  const categoryConfig = data.categoryData.reduce(
    (acc: any, item: any, i: number) => {
      acc[item.name] = { label: item.name, color: COLORS[i % COLORS.length] };
      return acc;
    },
    { value: { label: "Total Asset" } },
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-10 w-full max-w-7xl mx-auto">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan & Analitik</h1>
          <p className="text-muted-foreground mt-1">Laporan inventaris dan dashboard analitik aset instansi.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground font-medium">Laporan Inventaris</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open("/api/reports/inventaris/export?format=excel", "_blank")}>
                <FileSpreadsheet className="size-4 mr-2 text-emerald-600" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open("/api/reports/inventaris/export?format=pdf", "_blank")}>
                <FileDown className="size-4 mr-2 text-red-500" />
                PDF
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground font-medium">Laporan Analytics</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open("/api/reports/export?format=excel", "_blank")}>
                <FileSpreadsheet className="size-4 mr-2 text-emerald-600" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open("/api/reports/export?format=pdf", "_blank")}>
                <FileDown className="size-4 mr-2 text-red-500" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-5xl font-black text-primary">{data.totalAssets}</span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-2">Total Unit Aset</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution (Donut Chart) */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0 text-center">
            <CardTitle>Distribusi Status Aset</CardTitle>
            <CardDescription>Rasio kepemilikan aset yang difungsikan maupun di gudang</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={statusConfig} className="mx-auto aspect-square max-h-[300px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={data.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  strokeWidth={5} // Memberi jarak visual (gap) antar potongan
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  // Prop 'label' dihapus agar pie chart terlihat minimalis khas shadcn
                >
                  {data.statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-translate-y-2 flex-wrap gap-2" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Condition Distribution (Pie Chart) */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0 text-center">
            <CardTitle>Kondisi Aset Saat Ini</CardTitle>
            <CardDescription>Visualisasi tingkat kelayakan aset perusahaan</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={conditionConfig} className="mx-auto aspect-square max-h-[300px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={data.conditionData}
                  cx="50%"
                  cy="50%"
                  strokeWidth={2}
                  dataKey="value"
                  nameKey="name"
                  // Prop 'label' dihapus agar pie chart terlihat minimalis khas shadcn
                >
                  {data.conditionData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-translate-y-2 flex-wrap gap-2" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Categories (Bar Chart) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Top 5 Kategori Aset Terbanyak</CardTitle>
            <CardDescription>Rasio kategori terpadat saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryConfig} className="aspect-auto h-[350px] w-full">
              <BarChart accessibilityLayer data={data.categoryData}>
                {/* Hapus YAxis agar minimalis, hilangkan garis vertikal di background */}
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                {/* Gunakan radius=8 agar ujung bar melengkung sesuai style shadcn */}
                <Bar dataKey="value" radius={8}>
                  {data.categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
