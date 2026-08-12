"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { AssetLoansTable } from "@/components/asset-loans-table";
import { CreateAssetLoanDialog } from "@/components/create-asset-loan-dialog";
import { toast } from "sonner";

export default function AssetLoansPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const res = await fetch(`/api/asset-loans?${params}`);
      const data = await res.json();
      if (data.success) {
        setBatches(data.data.data);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch loan batches:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchBatches();
  }, [page, statusFilter]);

  const handleDelete = async (batch: any) => {
    if (!confirm(`Hapus data peminjaman ${batch.batchNumber}?`)) return;

    try {
      const res = await fetch(`/api/asset-loans/${batch.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Data peminjaman berhasil dihapus");
        fetchBatches();
      } else {
        toast.error(data.error || "Gagal menghapus data peminjaman");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  if (!isMounted) return null;

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Peminjaman Aset</h1>
            <p className="text-muted-foreground">Kelola peminjaman aset sementara</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Tambah Peminjaman
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="COMPLETED">Selesai</SelectItem>
              <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <AssetLoansTable
          batches={batches}
          loading={loading}
          page={page}
          total={total}
          onPageChange={setPage}
          onDelete={handleDelete}
          onRefresh={fetchBatches}
        />
      </div>

      <CreateAssetLoanDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          fetchBatches();
        }}
      />
    </>
  );
}
