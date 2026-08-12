"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { MoreHorizontal, Trash2, Eye, RotateCcw, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface AssetLoansTableProps {
  batches: any[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onDelete: (batch: any) => void;
  onRefresh: () => void;
}

const batchStatusConfig = {
  ACTIVE: { label: "Aktif", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  COMPLETED: { label: "Selesai", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  CANCELLED: { label: "Dibatalkan", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
};

const itemStatusConfig = {
  ACTIVE: { label: "Belum Kembali", className: "bg-blue-100 text-blue-800" },
  RETURNED: { label: "Dikembalikan", className: "bg-green-100 text-green-800" },
  OVERDUE: { label: "Terlambat", className: "bg-red-100 text-red-800" },
};

const limit = 10;

function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy", { locale: id });
}

function BatchDetailDialog({ batch, onRefresh, onClose }: { batch: any; onRefresh: () => void; onClose: () => void }) {
  const [returning, setReturning] = useState<string | null>(null);

  const handleReturnItem = async (itemId: string, assetName: string) => {
    if (!confirm(`Kembalikan aset "${assetName}"?`)) return;
    setReturning(itemId);
    try {
      const res = await fetch(`/api/asset-loans/${batch.id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Aset berhasil dikembalikan");
        onRefresh();
        onClose();
      } else {
        toast.error(data.error || "Gagal mengembalikan aset");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setReturning(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Peminjaman — {batch.batchNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Peminjam:</span> <span className="font-medium">{batch.borrowerName}</span></div>
            {batch.borrowerPosition && <div><span className="text-muted-foreground">Jabatan:</span> <span>{batch.borrowerPosition}</span></div>}
            {batch.purpose && <div className="col-span-2"><span className="text-muted-foreground">Keperluan:</span> <span>{batch.purpose}</span></div>}
            <div><span className="text-muted-foreground">Tgl Pinjam:</span> <span>{formatDate(batch.loanDate)}</span></div>
            <div><span className="text-muted-foreground">Rencana Kembali:</span> <span>{formatDate(batch.expectedReturnDate)}</span></div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aset</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tgl Kembali</TableHead>
                <TableHead className="w-[80px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.items?.map((item: any) => {
                const cfg = itemStatusConfig[item.status as keyof typeof itemStatusConfig];
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.asset?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{item.asset?.tagNumber}</TableCell>
                    <TableCell>
                      <Badge className={cfg?.className}>{cfg?.label ?? item.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(item.actualReturnDate)}</TableCell>
                    <TableCell>
                      {item.status !== "RETURNED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={returning === item.id}
                          onClick={() => handleReturnItem(item.id, item.asset?.name)}
                        >
                          <RotateCcw className="size-3 mr-1" />
                          Kembalikan
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AssetLoansTable({ batches, loading, page, total, onPageChange, onDelete, onRefresh }: AssetLoansTableProps) {
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <Card>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (batches.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <p className="text-lg font-semibold">Tidak ada data peminjaman</p>
          <p className="text-sm text-muted-foreground mt-1">Belum ada peminjaman aset yang tercatat</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Batch</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Keperluan</TableHead>
                <TableHead>Tgl Pinjam</TableHead>
                <TableHead>Rencana Kembali</TableHead>
                <TableHead>Aset</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat Oleh</TableHead>
                <TableHead className="w-[50px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const cfg = batchStatusConfig[batch.status as keyof typeof batchStatusConfig];
                const totalItems = batch.items?.length ?? 0;
                const returnedItems = batch.items?.filter((i: any) => i.status === "RETURNED").length ?? 0;
                return (
                  <TableRow key={batch.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedBatch(batch)}>
                    <TableCell className="font-mono text-sm font-semibold">{batch.batchNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium">{batch.borrowerName}</div>
                      {batch.borrowerPosition && <div className="text-xs text-muted-foreground">{batch.borrowerPosition}</div>}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate">{batch.purpose ?? "-"}</TableCell>
                    <TableCell>{formatDate(batch.loanDate)}</TableCell>
                    <TableCell>{formatDate(batch.expectedReturnDate)}</TableCell>
                    <TableCell>
                      <span className="text-sm">{returnedItems}/{totalItems} kembali</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cfg?.className}>{cfg?.label ?? batch.status}</Badge>
                    </TableCell>
                    <TableCell>{batch.createdBy?.fullName ?? "-"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSelectedBatch(batch)}>
                            <Eye className="mr-2 size-4" />
                            Lihat Detail
                          </DropdownMenuItem>
                          {batch.status !== "ACTIVE" && (
                            <DropdownMenuItem
                              onClick={() => onDelete(batch)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Hapus
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total} peminjaman
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              Sebelumnya
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      {selectedBatch && (
        <BatchDetailDialog
          batch={selectedBatch}
          onRefresh={onRefresh}
          onClose={() => setSelectedBatch(null)}
        />
      )}
    </>
  );
}
