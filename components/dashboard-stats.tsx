import { Package, PackageCheck, Wrench, AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStatsProps {
  data?: {
    total: number;
    available: number;
    inUse: number;
    inMaintenance: number;
    missing: number;
    disposed: number;
    valueStats: {
      totalValue: number;
      averageValue: number;
    };
    recentAdditions: number;
  };
}

export function DashboardStats({ data }: DashboardStatsProps) {
  if (!data) return null;

  const stats = [
    {
      label: "Total Assets",
      value: data.total.toLocaleString(),
      description: `${data.recentAdditions} added this week`,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Available",
      value: data.available.toLocaleString(),
      description: "Ready for use",
      icon: PackageCheck,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      label: "In Use",
      value: data.inUse.toLocaleString(),
      description: "Currently assigned",
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      label: "Maintenance",
      value: data.inMaintenance.toLocaleString(),
      description: "Under repair",
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
  ];

  // Add missing and disposed if they exist
  if (data.missing > 0) {
    stats.push({
      label: "Missing",
      value: data.missing.toLocaleString(),
      description: "Requires attention",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
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
