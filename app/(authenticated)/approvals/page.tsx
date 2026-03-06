"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ApprovalsInboxPage() {
  const router = useRouter();
  const [basts, setBasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bast?status=PENDING_MGR&limit=50`);
      const data = await response.json();
      if (data.success) {
        setBasts(data.data.basts);
      }
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full border-t">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">To-Do Inbox: Persetujuan Tingkat Atas</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Daftar BAST yang tertunda dan butuh penelaahan Manajerial (Nilai Aset Tinggi &gt; Rp 20Jt).</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : basts.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="size-16 text-green-500 mb-4 opacity-80" />
              <h2 className="text-xl font-semibold tracking-tight">Inbox Anda Bersih!</h2>
              <p className="text-muted-foreground mt-2 text-sm max-w-md">Tidak ada BAST yang menunggu persetujuan tingkat manajerial saat ini. Pertahankan produktivitas Anda.</p>
            </div>
          ) : (
            <div className="divide-y relative overflow-x-auto">
              {basts.map((bast) => (
                <div key={bast.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">{bast.bastNumber}</span>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                        Review Manager
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2 md:line-clamp-1">{bast.description || "Otomasi sistem untuk peninjauan nilai aset tinggi"}</p>
                    <div className="flex gap-4 text-xs font-medium text-muted-foreground mt-2">
                      <span className="bg-primary/5 px-2 py-0.5 rounded text-primary">Tipe: {bast.type}</span>
                      <span>Pembuat: {bast.creator?.fullName || "-"}</span>
                      <span>Tgl: {new Date(bast.createdAt).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>

                  <Button onClick={() => router.push(`/bast/${bast.id}`)} variant="default">
                    Tinjau BAST <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
