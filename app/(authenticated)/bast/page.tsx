"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { BastTable } from "@/components/bast-table";
import { CreateBastDialog } from "@/components/create-bast-dialog";
import { Plus, Search } from "lucide-react";

export default function BastPage() {
  const [basts, setBasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchBasts();
  }, [page, search, statusFilter, typeFilter]);

  const fetchBasts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(statusFilter && statusFilter !== "all" && { status: statusFilter }),
        ...(typeFilter && typeFilter !== "all" && { type: typeFilter }),
      });

      const response = await fetch(`/api/bast?${params}`);
      const data = await response.json();

      if (data.success) {
        setBasts(data.data.basts);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch BALists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">BAST</h1>
            <p className="text-muted-foreground">Berita Acara Serah Terima</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Create BAST
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search by BAST number..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
              </div>
              {mounted ? (
                <>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="PROCUREMENT">Pengadaan (Procurement)</SelectItem>
                      <SelectItem value="ASSIGNMENT">Serah Terima (Assignment)</SelectItem>
                      <SelectItem value="RETURN">Pengembalian (Return)</SelectItem>
                      <SelectItem value="MUTATION">Mutasi (Mutation)</SelectItem>
                      <SelectItem value="MAINTENANCE_OUT">Keluar ke Vendor</SelectItem>
                      <SelectItem value="MAINTENANCE_IN">Kembali dari Vendor</SelectItem>
                      <SelectItem value="DISPOSAL">Penghapusan (Disposal)</SelectItem>
                      <SelectItem value="STOCK_OPNAME">Stock Opname</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="flex gap-2">
                  <div className="h-10 w-full md:w-[180px] bg-muted animate-pulse rounded-md" />
                  <div className="h-10 w-full md:w-[180px] bg-muted animate-pulse rounded-md" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <BastTable basts={basts} loading={loading} page={page} total={total} onPageChange={setPage} onRefresh={fetchBasts} />
      </div>

      <CreateBastDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          fetchBasts();
        }}
      />
    </>
  );
}
