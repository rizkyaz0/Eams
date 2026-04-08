"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssetsTable } from "@/components/assets-table";
import { CreateAssetDialog } from "@/components/create-asset-dialog";
import { Plus, Search, QrCode, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { QrScannerDialog } from "@/components/qr-scanner-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Printer } from "lucide-react";

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchAssets();
    fetchCategories();
    fetchLocations();
  }, [page, search, statusFilter, categoryFilter, locationFilter, activeTab]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(statusFilter && statusFilter !== "all" && activeTab !== "trash" && { status: statusFilter }),
        ...(activeTab === "trash" && { status: "DISPOSED" }),
        ...(activeTab === "active" && (!statusFilter || statusFilter === "all") ? { excludeStatus: "DISPOSED" } : {}), // Jika active, ignore disposed
        ...(categoryFilter && categoryFilter !== "all" && { categoryId: categoryFilter }),
        ...(locationFilter && locationFilter !== "all" && { locationId: locationFilter }),
      });

      const response = await fetch(`/api/assets?${params}`);
      const data = await response.json();

      if (data.success) {
        setAssets(data.data.assets);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      const data = await response.json();
      if (data.success) {
        setLocations(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/assets?limit=100000`);
      const data = await response.json();
      if (data.success && data.data.assets) {
        const rows = [["Tag Number", "Name", "Category", "Status", "Condition", "Location", "Purchase Date"]];
        data.data.assets.forEach((asset: any) => {
          rows.push([asset.tagNumber, asset.name, asset.category?.name || "-", asset.status, asset.condition, asset.location?.name || "-", asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("id-ID") : "-"]);
        });

        const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `assets_export_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error("Gagal menarik data untuk expor");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan saat mengekspor");
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Header diubah menjadi flex-col di mobile, sejajar di sm ke atas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
            <p className="text-muted-foreground">Manage your organization's assets</p>
          </div>
          {/* flex-wrap ditambahkan agar tombol turun baris dengan rapi */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.open(`/assets/print-qrs?category=${categoryFilter}&location=${locationFilter}&status=${activeTab === 'trash' ? 'DISPOSED' : statusFilter}`, "_blank")} className="flex-1 sm:flex-none" title="Cetak QR Code yang di filter">
              <Printer className="mr-2 size-4" />
              Print QR
            </Button>
            <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none">
              <Download className="mr-2 size-4" />
              Export
            </Button>
            <Button variant="outline" onClick={() => setScannerOpen(true)} className="flex-1 sm:flex-none">
              <QrCode className="mr-2 size-4" />
              Scan
            </Button>
            {/* Tombol utama Add Asset akan memenuhi 1 baris penuh di mobile, tapi menyesuaikan konten di desktop */}
            <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 size-4" />
              Tambah Aset
            </Button>
          </div>
        </div>

        <Tabs defaultValue="active" onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
          <TabsList className="mb-4">
            <TabsTrigger value="active">Daftar Aset</TabsTrigger>
            <TabsTrigger value="trash" className="text-red-500 data-[state=active]:text-red-600">
              <Trash2 className="size-4 mr-2" />
              Tempat Sampah
            </TabsTrigger>
          </TabsList>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search by name or tag number..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
              </div>
              {mounted ? (
                <>
                  {activeTab !== "trash" && (
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-[150px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="IN_USE">In Use</SelectItem>
                        <SelectItem value="IN_MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="MISSING">Missing</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                // Skeleton loading juga disesuaikan menjadi flex-col di mobile agar tidak terpotong layarnya
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  <div className="h-10 w-full md:w-[180px] bg-muted animate-pulse rounded-md" />
                  <div className="h-10 w-full md:w-[180px] bg-muted animate-pulse rounded-md" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <AssetsTable assets={assets} loading={loading} page={page} total={total} onPageChange={setPage} onRefresh={fetchAssets} categories={categories} locations={locations} isTrash={activeTab === 'trash'} />
        </Tabs>
      </div>

      <CreateAssetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          fetchAssets();
        }}
        categories={categories}
        locations={locations}
      />

      <QrScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} />
    </>
  );
}
