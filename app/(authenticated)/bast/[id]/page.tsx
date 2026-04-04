"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileDown, FileSpreadsheet, ArrowLeft,
  CheckCircle2, Clock, UserCheck, Printer, Lock
} from "lucide-react";
import { toast } from "sonner";

const kondisiLabel: Record<string, string> = {
  GOOD: "Baik", MINOR_DAMAGE: "Rusak Ringan",
  MAJOR_DAMAGE: "Rusak Berat", TOTAL_LOSS: "Hilang",
};

const typeConfig: Record<string, string> = {
  PROCUREMENT: "Pengadaan", ASSIGNMENT: "Penyerahan / Peminjaman",
  RETURN: "Pengembalian", MUTATION: "Mutasi",
  MAINTENANCE_OUT: "Keluar Perbaikan", MAINTENANCE_IN: "Masuk Perbaikan",
  DISPOSAL: "Penghapusan", STOCK_OPNAME: "Stock Opname",
};

export default function BastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bast, setBast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [approving, setApproving] = useState<"serah" | "terima" | null>(null);

  useEffect(() => {
    fetchBast();
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.success) setCurrentUser(d.data); }).catch(() => {});
  }, [params.id]);

  const fetchBast = async () => {
    try {
      const response = await fetch(`/api/bast/${params.id}`);
      const data = await response.json();
      if (data.success) setBast(data.data);
    } catch (error) {
      console.error("Failed to fetch BAST:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Approve BAST sebagai pihak serah atau terima
   * File API: app/api/bast/[id]/approve/route.ts
   */
  const handleApprove = async (pihak: "serah" | "terima") => {
    setApproving(pihak);
    try {
      const res = await fetch(`/api/bast/${params.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pihak }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Persetujuan berhasil");
        fetchBast();
      } else {
        toast.error(data.error || "Gagal");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!bast) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 gap-4">
        <p className="text-lg font-semibold">BAST tidak ditemukan</p>
        <Button onClick={() => router.push("/bast")}>Kembali ke Daftar BAST</Button>
      </div>
    );
  }

  const isSerah  = currentUser && bast.userSerahId  === currentUser.id;
  const isTerima = currentUser && bast.userTerimaId === currentUser.id;
  const sudahSerah  = bast.statusSerah  === "APPROVED";
  const sudahTerima = bast.statusTerima === "APPROVED";

  // GUARD: Tombol cetak/export hanya muncul jika kedua pihak sudah approve
  const canExport = bast.status === "APPROVED" && sudahSerah && sudahTerima;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 max-w-5xl mx-auto w-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/bast")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{bast.bastNumber}</h1>
            <p className="text-muted-foreground text-sm">{typeConfig[bast.type] || bast.type}</p>
          </div>
        </div>

        {/* Tombol Export — hanya aktif jika sudah diapprove kedua pihak */}
        <div className="flex gap-2 flex-wrap">
          {canExport ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/bast/${bast.id}/export?format=pdf`, "_blank")}
              >
                <FileDown className="size-4 mr-2 text-red-500" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/bast/${bast.id}/export?format=excel`, "_blank")}
              >
                <FileSpreadsheet className="size-4 mr-2 text-emerald-600" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="size-4 mr-2" />
                Cetak
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
              <Lock className="size-4" />
              Cetak & export tersedia setelah kedua pihak menyetujui
            </div>
          )}
        </div>
      </div>

      {/* Status Approval Kedua Pihak */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Penyerah */}
        <Card className={`border-2 ${sudahSerah ? "border-green-200 bg-green-50/30 dark:bg-green-950/20" : "border-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/20"}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Yang Menyerahkan</p>
                <p className="font-semibold">{bast.userSerah?.fullName || bast.recipientName || "—"}</p>
                <p className="text-sm text-muted-foreground">{bast.userSerah?.lembaga || "—"}</p>
              </div>
              {sudahSerah ? (
                <Badge className="bg-green-100 text-green-700 border-green-300 shrink-0 gap-1">
                  <CheckCircle2 className="size-3" /> Disetujui
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 shrink-0 gap-1">
                  <Clock className="size-3" /> Menunggu
                </Badge>
              )}
            </div>
            {/* Tombol approve untuk pihak serah */}
            {isSerah && !sudahSerah && bast.status === "PENDING" && (
              <Button
                size="sm"
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleApprove("serah")}
                disabled={approving === "serah"}
              >
                <UserCheck className="size-4 mr-2" />
                {approving === "serah" ? "Memproses..." : "Setujui sebagai Penyerah"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Penerima */}
        <Card className={`border-2 ${sudahTerima ? "border-green-200 bg-green-50/30 dark:bg-green-950/20" : "border-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/20"}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Yang Menerima</p>
                <p className="font-semibold">{bast.userTerima?.fullName || "—"}</p>
                <p className="text-sm text-muted-foreground">{bast.userTerima?.lembaga || "—"}</p>
              </div>
              {sudahTerima ? (
                <Badge className="bg-green-100 text-green-700 border-green-300 shrink-0 gap-1">
                  <CheckCircle2 className="size-3" /> Disetujui
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 shrink-0 gap-1">
                  <Clock className="size-3" /> Menunggu
                </Badge>
              )}
            </div>
            {/* Tombol approve untuk pihak terima */}
            {isTerima && !sudahTerima && bast.status === "PENDING" && (
              <Button
                size="sm"
                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleApprove("terima")}
                disabled={approving === "terima"}
              >
                <UserCheck className="size-4 mr-2" />
                {approving === "terima" ? "Memproses..." : "Setujui sebagai Penerima"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info BAST */}
      <Card>
        <CardHeader><CardTitle>Informasi BAST</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Nomor BAST</p>
            <p className="font-mono font-semibold">{bast.bastNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Tipe</p>
            <p>{typeConfig[bast.type] || bast.type}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Status Keseluruhan</p>
            <Badge variant={bast.status === "APPROVED" ? "default" : bast.status === "DRAFT" ? "outline" : "secondary"}>
              {bast.status === "APPROVED" ? "Disetujui" : bast.status === "DRAFT" ? "Draft" : "Menunggu Persetujuan"}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Dibuat Oleh</p>
            <p>{bast.creator?.fullName || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Tanggal Dibuat</p>
            <p>{new Date(bast.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
          </div>
          {bast.approvedAt && (
            <div>
              <p className="text-muted-foreground mb-1">Tanggal Disetujui</p>
              <p>{new Date(bast.approvedAt).toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
            </div>
          )}
          {bast.description && (
            <div className="col-span-2">
              <p className="text-muted-foreground mb-1">Catatan</p>
              <p className="text-sm">{bast.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daftar Barang */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Barang ({bast.details?.length || 0} item)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Kode / Tag</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bast.details?.map((item: any, i: number) => (
                  <TableRow key={item.id}>
                    <TableCell className="w-10">{i + 1}</TableCell>
                    <TableCell className="font-medium">{item.asset?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{item.asset?.tagNumber}</TableCell>
                    <TableCell>{item.asset?.category?.name || "—"}</TableCell>
                    <TableCell>{item.asset?.location?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {kondisiLabel[item.conditionAfter] || item.conditionAfter}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.description || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
