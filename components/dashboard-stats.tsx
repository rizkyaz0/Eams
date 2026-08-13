import {
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  Package,
  PackageCheck,
  PackageX,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStatsProps {
  data?: {
    total: number;
    available: number;
    inUse: number;
    inMaintenance: number;
    borrowed: number;
    missing: number;
    disposed: number;
    valueStats: {
      totalValue: number;
      averageValue: number;
    };
    recentAdditions: number;
    openDamageReports: number;
    activeLoanBatches: number;
  };
}

/**
 * Format a number as a compact Rupiah value: "Rp 1,2M" for millions,
 * "Rp 1,5B" for billions, falling back to full formatting below that.
 * Coerces via Number() because Prisma Decimal values arrive as strings.
 */
function formatCompactRupiah(value: number): string {
  const num = Number(value);
  if (num >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
  }
  if (num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}Jt`;
  }
  if (num >= 1_000) {
    return `Rp ${(num / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}Rb`;
  }
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export function DashboardStats({ data }: DashboardStatsProps) {
  if (!data) return null;

  const stats = [
    {
      label: "Total Aset",
      value: data.total.toLocaleString(),
      description: `${data.recentAdditions} ditambahkan minggu ini`,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Tersedia",
      value: data.available.toLocaleString(),
      description: "Siap digunakan",
      icon: PackageCheck,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      label: "Digunakan",
      value: data.inUse.toLocaleString(),
      description: "Sedang dipinjam",
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      label: "Pemeliharaan",
      value: data.inMaintenance.toLocaleString(),
      description: "Sedang diperbaiki",
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      label: "Dipinjam",
      value: data.borrowed.toLocaleString(),
      description: "Sedang dipinjam",
      icon: ArrowLeftRight,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
    },
    {
      label: "Laporan Rusak",
      value: data.openDamageReports.toLocaleString(),
      description: "Perlu ditangani",
      icon: PackageX,
      color: "text-rose-600",
      bgColor: "bg-rose-50 dark:bg-rose-950",
    },
    {
      label: "Peminjaman Aktif",
      value: data.activeLoanBatches.toLocaleString(),
      description: "Sedang berjalan",
      icon: ClipboardList,
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-950",
    },
    {
      label: "Nilai Total Aset",
      value: formatCompactRupiah(data.valueStats.totalValue),
      description: `Rata-rata ${formatCompactRupiah(data.valueStats.averageValue)}`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
  ];

  // Add missing if it exists
  if (data.missing > 0) {
    stats.push({
      label: "Hilang",
      value: data.missing.toLocaleString(),
      description: "Perlu perhatian",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-3xl font-bold tabular-nums mt-2">{stat.value}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">{stat.description}</p>
                </div>
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <Icon className="size-6" />
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}