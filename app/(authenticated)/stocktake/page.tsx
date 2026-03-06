"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, ListChecks, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function StockTakeListPage() {
  const router = useRouter();
  const [stockTakes, setStockTakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockTakes();
  }, []);

  const fetchStockTakes = async () => {
    try {
      const res = await fetch("/api/stocktake");
      const data = await res.json();
      if (data.success) {
        setStockTakes(data.data.stockTakes);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-10 w-full max-w-7xl mx-auto border-t">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit & Opname (Blind Stock-Take)</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Kelola siklus rekonsiliasi stok fisik versus database tanpa membocorkan data qty asli ke petugas lapangan.</p>
        </div>
        <Button onClick={() => router.push("/stocktake/new")} className="hidden sm:flex">
          <Plus className="mr-2 size-4" />
          Rilis Audit Baru
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Skeleton className="h-32 w-full border-muted" />
        ) : stockTakes.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ListChecks className="size-16 text-muted-foreground mb-4 opacity-50" />
              <h2 className="text-xl font-bold">Belum Ada Sesi Opname Aktif</h2>
              <p className="text-muted-foreground max-w-sm mt-2">Mulai rilis sesi Stock-Take baru untuk memastikan keakuratan jumlah aset riil perusahaan Anda.</p>
              <Button className="mt-6" onClick={() => router.push("/stocktake/new")}>
                Mulai Audit Sekarang
              </Button>
            </CardContent>
          </Card>
        ) : (
          stockTakes.map((st) => (
            <Card key={st.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold">{st.title}</h3>
                    <Badge variant={st.status === "OPEN" ? "default" : "secondary"}>{st.status === "OPEN" ? "Sedang Berjalan (Diproses Auditor)" : "Selesai (Reconciled)"}</Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-2 font-medium">
                    <span>Auditor: {st.auditor?.fullName || "-"}</span>
                    <span>Target Aset: {st._count?.details || 0} unit</span>
                    <span>Tgl Mulai: {new Date(st.startDate).toLocaleDateString("id-ID")}</span>
                    {st.endDate && <span>Ditutup: {new Date(st.endDate).toLocaleDateString("id-ID")}</span>}
                  </div>
                </div>
                <Button onClick={() => router.push(`/stocktake/${st.id}`)} variant={st.status === "OPEN" ? "default" : "outline"}>
                  {st.status === "OPEN" ? "Lakukan Penghitungan" : "Lihat Hasil Varian"}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
