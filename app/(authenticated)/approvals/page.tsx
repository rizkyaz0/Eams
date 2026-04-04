"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ArrowRight, Clock, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ApprovalsInboxPage() {
  const router = useRouter();
  const [basts, setBasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    // Ambil info user yang sedang login
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCurrentUser(d.data); })
      .catch(() => {});

    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      // Ambil semua BAST dengan status PENDING
      const response = await fetch(`/api/bast?status=PENDING&limit=100`);
      const data = await response.json();
      if (data.success) {
        setBasts(data.data.basts || []);
      }
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Approve BAST sebagai pihak serah atau terima
   * Memanggil: POST /api/bast/[id]/approve dengan body { pihak: "serah"|"terima" }
   */
  const handleApprove = async (bastId: string, pihak: "serah" | "terima") => {
    setApproving(`${bastId}-${pihak}`);
    try {
      const res = await fetch(`/api/bast/${bastId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pihak }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Persetujuan berhasil");
        fetchPendingApprovals(); // refresh list
      } else {
        toast.error(data.error || "Gagal memproses persetujuan");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setApproving(null);
    }
  };

  // Filter BAST yang relevan untuk user ini (sebagai serah atau terima)
  const myBasts = basts.filter((bast) => {
    if (!currentUser) return true; // tampilkan semua kalau belum tahu user
    return bast.userSerahId === currentUser.id || bast.userTerimaId === currentUser.id;
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Persetujuan BAST Saya</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Daftar BAST yang menunggu persetujuan Anda sebagai pihak penyerah atau penerima barang.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : myBasts.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="size-16 text-green-500 mb-4 opacity-80" />
              <h2 className="text-xl font-semibold tracking-tight">Tidak ada BAST menunggu persetujuan</h2>
              <p className="text-muted-foreground mt-2 text-sm max-w-md">
                Semua BAST yang perlu Anda setujui sudah ditangani. 
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {myBasts.map((bast) => {
                const isSerah  = currentUser && bast.userSerahId  === currentUser.id;
                const isTerima = currentUser && bast.userTerimaId === currentUser.id;
                const sudahSerah  = bast.statusSerah  === "APPROVED";
                const sudahTerima = bast.statusTerima === "APPROVED";

                return (
                  <div key={bast.id} className="p-5 flex flex-col gap-4 hover:bg-muted/30 transition-colors">
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base">{bast.bastNumber}</span>
                          <Badge variant="outline" className="text-[10px]">{bast.type}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm line-clamp-1">
                          {bast.description || "Tidak ada deskripsi"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dibuat: {new Date(bast.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
                          {" · "}Oleh: {bast.creator?.fullName || "-"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/bast/${bast.id}`)}
                        className="shrink-0"
                      >
                        Detail <ArrowRight className="ml-1 size-4" />
                      </Button>
                    </div>

                    {/* Status approval kedua pihak */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Pihak Penyerah */}
                      <div className="flex-1 flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Yang Menyerahkan</p>
                          <p className="text-sm font-semibold">{bast.userSerah?.fullName || bast.recipientName || "-"}</p>
                          <p className="text-xs text-muted-foreground">{bast.userSerah?.lembaga || "-"}</p>
                        </div>
                        {sudahSerah ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300 gap-1">
                            <CheckCircle2 className="size-3" /> Disetujui
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 gap-1">
                            <Clock className="size-3" /> Menunggu
                          </Badge>
                        )}
                      </div>

                      {/* Pihak Penerima */}
                      <div className="flex-1 flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Yang Menerima</p>
                          <p className="text-sm font-semibold">{bast.userTerima?.fullName || "-"}</p>
                          <p className="text-xs text-muted-foreground">{bast.userTerima?.lembaga || "-"}</p>
                        </div>
                        {sudahTerima ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300 gap-1">
                            <CheckCircle2 className="size-3" /> Disetujui
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 gap-1">
                            <Clock className="size-3" /> Menunggu
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Tombol approve (hanya muncul jika user adalah pihak terkait dan belum approve) */}
                    <div className="flex gap-2 flex-wrap">
                      {isSerah && !sudahSerah && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(bast.id, "serah")}
                          disabled={approving === `${bast.id}-serah`}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <UserCheck className="mr-2 size-4" />
                          {approving === `${bast.id}-serah` ? "Memproses..." : "Setujui sebagai Penyerah"}
                        </Button>
                      )}
                      {isTerima && !sudahTerima && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(bast.id, "terima")}
                          disabled={approving === `${bast.id}-terima`}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <UserCheck className="mr-2 size-4" />
                          {approving === `${bast.id}-terima` ? "Memproses..." : "Setujui sebagai Penerima"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
