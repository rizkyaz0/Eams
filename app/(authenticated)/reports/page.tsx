"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Wrench, ArrowLeftRight, AlertTriangle, Package, ShieldAlert } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#6b7280"];

function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: number | string; sub?: string; icon?: any; color?: string }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-start gap-4">
        {Icon && (
          <div className={`p-2 rounded-lg ${color ?? "bg-primary/10"}`}>
            <Icon className="size-5 text-primary" />
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight border-b pb-2">{title}</h2>
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load reports API data", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-10 text-center">Data tidak tersedia</div>;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laporan & Analitik</h1>
        <p className="text-muted-foreground mt-1">Ringkasan kondisi aset, peminjaman, dan pemeliharaan.</p>
      </div>

      {/* Overview */}
      <Section title="Ringkasan Aset">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Aset" value={data.totalAssets} icon={Package} />
          <StatCard
            title="Sedang Digunakan"
            value={data.statusData.find((s: any) => s.name === "Digunakan")?.value ?? 0}
            sub="via BAST"
          />
          <StatCard
            title="Sedang Dipinjam"
            value={data.statusData.find((s: any) => s.name === "Dipinjam")?.value ?? 0}
            sub="peminjaman sementara"
          />
          <StatCard
            title="Dalam Pemeliharaan"
            value={data.statusData.find((s: any) => s.name === "Pemeliharaan")?.value ?? 0}
          />
        </div>
      </Section>

      {/* Charts */}
      <Section title="Komposisi Aset">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Status</CardTitle>
              <CardDescription>Proporsi status seluruh aset</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" nameKey="name">
                    {data.statusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kondisi Aset</CardTitle>
              <CardDescription>Tingkat kelayakan aset saat ini</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.conditionData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name">
                    {data.conditionData.map((_: any, i: number) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 Kategori</CardTitle>
              <CardDescription>Kategori dengan jumlah aset terbanyak</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.categoryData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aset per Divisi/Jurusan</CardTitle>
              <CardDescription>Distribusi aset di tiap unit</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.divisionData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Stock by Category */}
      {data.stockByCategory?.length > 0 && (
        <Section title="Ringkasan Stok per Kategori">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Tersedia</TableHead>
                    <TableHead className="text-right">Digunakan</TableHead>
                    <TableHead className="text-right">Dipinjam</TableHead>
                    <TableHead className="text-right">Pemeliharaan</TableHead>
                    <TableHead className="text-right">Lainnya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.stockByCategory.map((row: any) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right font-semibold">{row.total}</TableCell>
                      <TableCell className="text-right text-green-600">{row.available || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell className="text-right text-blue-600">{row.inUse || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell className="text-right text-purple-600">{row.borrowed || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell className="text-right text-amber-600">{row.inMaintenance || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.other || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </Section>
      )}

      {/* Maintenance */}
      <Section title="Pemeliharaan">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Sedang Berjalan" value={data.maintenance.active} icon={Wrench} />
          <StatCard title="Menunggu" value={data.maintenance.pending} />
          <StatCard title="Total Biaya" value={formatCurrency(data.maintenance.totalCost)} sub="seluruh maintenance" />
        </div>
      </Section>

      {/* Loans */}
      <Section title="Peminjaman Aset">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Batch Aktif" value={data.loans.activeBatches} icon={ArrowLeftRight} />
          <StatCard title="Item Dipinjam" value={data.loans.activeItems} sub="unit sedang keluar" />
          <StatCard title="Item Terlambat" value={data.loans.overdueItems} icon={AlertTriangle} color="bg-red-100" />
        </div>
      </Section>

      {/* Damage Reports */}
      <Section title="Laporan Kerusakan">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Terbuka" value={data.damage.open} icon={ShieldAlert} color="bg-red-100" />
          <StatCard title="Sedang Ditangani" value={data.damage.inProgress} />
          <StatCard title="Diselesaikan" value={data.damage.resolved} />
        </div>
      </Section>

      {/* Warranty Expiry */}
      {data.warrantyExpiring?.length > 0 && (
        <Section title="Garansi Akan Berakhir (30 hari)">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aset</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Berakhir</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.warrantyExpiring.map((asset: any) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell className="font-mono text-xs">{asset.tagNumber}</TableCell>
                      <TableCell>{asset.category?.name ?? "-"}</TableCell>
                      <TableCell>{asset.division?.name ?? "-"}</TableCell>
                      <TableCell className="text-orange-600 font-medium">
                        {asset.warrantyExpiry ? format(new Date(asset.warrantyExpiry), "dd MMM yyyy", { locale: id }) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{asset.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </Section>
      )}
    </div>
  );
}
