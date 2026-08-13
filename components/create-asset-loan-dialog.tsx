"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface CreateAssetLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAssetLoanDialog({ open, onOpenChange, onSuccess }: CreateAssetLoanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerPosition, setBorrowerPosition] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loanDate, setLoanDate] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      fetchAssets();
      setLoanDate(new Date().toISOString().split("T")[0]);
      setSelectedIds([]);
    }
  }, [open]);

  const fetchAssets = async () => {
    setSearching(true);
    try {
      const res = await fetch("/api/assets?limit=500");
      const data = await res.json();
      if (data.success) {
        const borrowable = (data.data.assets as any[]).filter((a) =>
          ["AVAILABLE", "IN_USE"].includes(a.status)
        );
        setAssets(borrowable);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setSearching(false);
    }
  };

  const toggleAsset = (assetId: string) => {
    setSelectedIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tagNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setSelectedIds([]);
    setBorrowerName("");
    setBorrowerPosition("");
    setPurpose("");
    setLoanDate("");
    setExpectedReturnDate("");
    setNotes("");
    setSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast.error("Pilih minimal satu aset");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/asset-loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: selectedIds,
          borrowerName,
          borrowerPosition: borrowerPosition || null,
          purpose: purpose || null,
          loanDate,
          expectedReturnDate: expectedReturnDate || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat peminjaman");

      toast.success(`Peminjaman ${selectedIds.length} aset berhasil dibuat`);
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        {!mounted ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Tambah Peminjaman Aset</DialogTitle>
              <DialogDescription>Pilih satu atau beberapa aset untuk dipinjam sekaligus.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Asset multi-select */}
              <div className="grid gap-2">
                <Label>
                  Pilih Aset{" "}
                  <span className="text-muted-foreground font-normal">
                    ({selectedIds.length} dipilih)
                  </span>
                </Label>
                <div className="border rounded-md">
                  <div className="flex items-center gap-2 p-2 border-b">
                    <Search className="size-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="Cari aset..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="border-0 shadow-none focus-visible:ring-0 h-7 p-0"
                    />
                  </div>
                  <ScrollArea className="h-48">
                    {searching ? (
                      <div className="flex items-center justify-center h-24">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredAssets.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-6">Tidak ada aset tersedia</p>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggleAsset(asset.id)}
                          >
                            <div className={`h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center ${selectedIds.includes(asset.id) ? "bg-primary border-primary" : "border-input"}`}>
                              {selectedIds.includes(asset.id) && (
                                <svg className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{asset.name}</p>
                              <p className="text-xs text-muted-foreground">{asset.tagNumber} · {asset.category?.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="borrowerName">Nama Peminjam</Label>
                  <Input
                    id="borrowerName"
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="Nama lengkap"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="borrowerPosition">Jabatan / Unit</Label>
                  <Input
                    id="borrowerPosition"
                    value={borrowerPosition}
                    onChange={(e) => setBorrowerPosition(e.target.value)}
                    placeholder="Opsional"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="purpose">Keperluan</Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Jelaskan keperluan peminjaman"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="loanDate">Tanggal Pinjam</Label>
                  <Input
                    id="loanDate"
                    type="date"
                    value={loanDate}
                    onChange={(e) => setLoanDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedReturnDate">Rencana Kembali</Label>
                  <Input
                    id="expectedReturnDate"
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan (opsional)"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading || selectedIds.length === 0 || !borrowerName || !loanDate}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan {selectedIds.length > 0 && `(${selectedIds.length} aset)`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
