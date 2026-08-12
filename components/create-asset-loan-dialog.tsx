"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);

  const [assetId, setAssetId] = useState("");
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
    }
  }, [open]);

  const fetchAssets = async () => {
    setSearching(true);
    try {
      const res = await fetch("/api/assets?limit=200&status=AVAILABLE");
      const data = await res.json();
      if (data.success) {
        // Include AVAILABLE and IN_USE assets (borrowable)
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

  const resetForm = () => {
    setAssetId("");
    setBorrowerName("");
    setBorrowerPosition("");
    setPurpose("");
    setLoanDate("");
    setExpectedReturnDate("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/asset-loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
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

      toast.success("Peminjaman berhasil dibuat");
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
      <DialogContent className="sm:max-w-[520px]">
        {!mounted ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Tambah Peminjaman Aset</DialogTitle>
              <DialogDescription>Catat peminjaman aset sementara kepada pihak tertentu.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="asset">Aset</Label>
                <Select value={assetId} onValueChange={setAssetId} required>
                  <SelectTrigger id="asset">
                    <SelectValue placeholder={searching ? "Memuat aset..." : "Pilih aset"} />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.tagNumber} — {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Button type="submit" disabled={loading || !assetId || !borrowerName || !loanDate}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
