"use client";

import { Activity, CalendarX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardAlertsProps {
  warrantyData?: Array<{
    id: string;
    name: string;
    tagNumber: string;
    warrantyExpiry: string;
    category: { name: string };
  }>;
  activityData?: Array<{
    id: string;
    type: "BAST" | "MAINTENANCE";
    title: string;
    user: string;
    date: string;
  }>;
}

/** Days between now and a date string, rounded up and clamped at 0. */
function daysUntil(dateString: string): number {
  const target = new Date(dateString).getTime();
  return Math.max(0, Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24)));
}

/** Compact Indonesian relative time: "Baru saja", "5 menit lalu", "2 jam lalu", "3 hari lalu". */
function formatRelativeDate(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
}

/** Urgency styling for warranty countdown: red ≤ 7 days, amber ≤ 14, yellow ≤ 30. */
function warrantyUrgency(days: number): { dot: string; text: string } {
  if (days <= 7) return { dot: "bg-red-500", text: "text-red-600" };
  if (days <= 14) return { dot: "bg-amber-500", text: "text-amber-600" };
  return { dot: "bg-yellow-500", text: "text-yellow-600" };
}

export function DashboardAlerts({ warrantyData, activityData }: DashboardAlertsProps) {
  const warranties = (warrantyData ?? []).slice(0, 5);
  const activities = (activityData ?? []).slice(0, 8);

  return (
    <div className="px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Garansi Segera Habis */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted">
                <CalendarX className="size-4 text-muted-foreground" />
              </div>
              <CardTitle>Garansi Segera Habis</CardTitle>
            </div>
            <CardDescription>Aset dengan garansi berakhir dalam 30 hari</CardDescription>
          </CardHeader>
          <CardContent>
            {warranties.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada garansi yang akan habis dalam 30 hari</p>
            ) : (
              <div className="space-y-3">
                {warranties.map((item) => {
                  const days = daysUntil(item.warrantyExpiry);
                  const urgency = warrantyUrgency(days);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`size-2 rounded-full shrink-0 ${urgency.dot}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.tagNumber}
                            {item.category?.name ? ` • ${item.category.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold whitespace-nowrap ${urgency.text}`}>
                        {days === 0 ? "Hari ini" : `${days} hari lagi`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aktivitas Terbaru */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted">
                <Activity className="size-4 text-muted-foreground" />
              </div>
              <CardTitle>Aktivitas Terbaru</CardTitle>
            </div>
            <CardDescription>Perubahan terbaru pada aset</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas</p>
            ) : (
              <div className="space-y-3">
                {activities.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div
                      className={`size-2.5 rounded-full shrink-0 ${item.type === "BAST" ? "bg-blue-500" : "bg-amber-500"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.user}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeDate(item.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}