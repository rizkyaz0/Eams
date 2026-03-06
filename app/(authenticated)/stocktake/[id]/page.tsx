"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, XCircle, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function StockTakeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stockTake, setStockTake] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // State to track counted items: { detailId: countedQty (1 or 0) }
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStockTake();
  }, [params.id]);

  const fetchStockTake = async () => {
    try {
      const res = await fetch(`/api/stocktake/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setStockTake(data.data);
        // Initialize counts to -1 (unscanned/unknown)
        const initialCounts: Record<string, number> = {};
        data.data.details.forEach((d: any) => {
          // If already reconciled, load the saved variance, else -1
          initialCounts[d.id] = d.countedQty !== undefined && data.data.status === "RECONCILED" ? d.countedQty : -1;
        });
        setCounts(initialCounts);
      }
    } catch (error) {
      toast.error("Gagal memuat detail opname");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFound = (detailId: string) => {
    setCounts((prev) => ({ ...prev, [detailId]: 1 }));
  };

  const handleMarkMissing = (detailId: string) => {
    setCounts((prev) => ({ ...prev, [detailId]: 0 }));
  };

  const handleSubmit = async () => {
    // Validate if all items have been checked (no -1s)
    const uncheckedCount = Object.values(counts).filter((v) => v === -1).length;
    if (uncheckedCount > 0) {
      return toast.warning(`Ada ${uncheckedCount} aset yang belum Anda tandai Ditemukan/Hilang!`);
    }

    setSubmitting(true);
    try {
      const payload = {
        audits: stockTake.details.map((d: any) => ({
          detailId: d.id,
          assetId: d.assetId,
          countedQty: counts[d.id],
          condition: d.condition || "GOOD",
        })),
      };

      const res = await fetch(`/api/stocktake/${stockTake.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchStockTake(); // Refresh to see RECONCILED status
      } else {
        toast.error(data.error || "Gagal rekonsiliasi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan server");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  if (!stockTake) return <div className="p-10 text-center">Data not found</div>;

  const filteredDetails = stockTake.details.filter((d: any) => d.asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.asset.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()));

  const doneCount = Object.values(counts).filter((v) => v !== -1).length;
  const totalCount = stockTake.details.length;
  const isClosed = stockTake.status === "RECONCILED";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-10 w-full max-w-3xl mx-auto border-t">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/stocktake")} className="shrink-0">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight line-clamp-1">{stockTake.title}</h1>
            {isClosed && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Ditutup
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Target: {totalCount} Aset • Progres: {doneCount}/{totalCount}
          </p>
        </div>
      </div>

      {!isClosed && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Cari nama aset / tag number untuk di-scan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-12 text-md" />
          </div>
        </div>
      )}

      {isClosed && (
        <Card className="bg-green-500/10 border-green-200">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-green-700 mb-2">Opname Selesai & Terekseskusi (Blind-Reconciled)</h2>
            <p className="text-sm text-green-600">Terima kasih. Laporan rekonsiliasi varian dan auto-alert barang hilang (jika ada) telah masuk ke sistem pusat.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredDetails.map((detail: any) => {
          const statusCount = counts[detail.id]; // 1 (Found), 0 (Missing), -1 (Pending)
          return (
            <Card key={detail.id} className={`overflow-hidden transition-all ${statusCount === 1 ? "border-green-500/50 bg-green-50/30" : statusCount === 0 ? "border-red-500/50 bg-red-50/30" : ""}`}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1">{detail.asset.tagNumber}</p>
                  <h3 className="font-semibold">{detail.asset.name}</h3>
                  {isClosed && detail.variance < 0 && <span className="text-xs font-bold text-red-500 mt-1 block">Status Varian: HILANG (Selisih -1 Unit Qty)</span>}
                  {isClosed && detail.variance === 0 && <span className="text-xs font-bold text-green-600 mt-1 block">Status Varian: COCOK / TEPAT</span>}
                </div>

                {!isClosed && (
                  <div className="flex gap-2 shrink-0">
                    <Button variant={statusCount === 0 ? "destructive" : "outline"} className={statusCount === 0 ? "" : "hover:bg-red-50 hover:text-red-600 hover:border-red-200"} onClick={() => handleMarkMissing(detail.id)}>
                      <XCircle className="size-4 mr-2" />
                      Hilang
                    </Button>
                    <Button
                      variant={statusCount === 1 ? "default" : "outline"}
                      className={statusCount === 1 ? "bg-green-600 hover:bg-green-700" : "hover:bg-green-50 hover:text-green-600 hover:border-green-200"}
                      onClick={() => handleMarkFound(detail.id)}
                    >
                      <CheckCircle2 className="size-4 mr-2" />
                      Ditemukan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isClosed && (
        <div className="mt-8 pt-6 border-t flex justify-end pb-10">
          <Button size="lg" className="w-full sm:w-auto text-md h-12 px-8" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 size-5 animate-spin" /> : <CheckCircle2 className="mr-2 size-5" />}
            Submit Hasil Audit (Rekonsiliasi Final)
          </Button>
        </div>
      )}
    </div>
  );
}
