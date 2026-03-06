"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronLeft, ChevronRight, Search, UserCheck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { createBast } from "@/lib/actions/bast-actions";
import { BastType, AssetCondition } from "@prisma/client";

interface CreateBastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const BAST_TYPE_LABELS: Record<string, string> = {
  ASSIGNMENT: "Serah Terima / Penyerahan Aset",
  RETURN: "Pengembalian Aset",
  MUTATION: "Mutasi / Pemindahan Aset",
  DISPOSAL: "Penghapusan Aset",
  MAINTENANCE_OUT: "Keluar ke Vendor Perbaikan",
  MAINTENANCE_IN: "Kembali dari Vendor Perbaikan",
  PROCUREMENT: "Pengadaan Aset Baru",
  STOCK_OPNAME: "Stock Opname",
};

// Which BAST types require a target user (Penanggung Jawab Baru)
const NEEDS_HOLDER: BastType[] = [BastType.ASSIGNMENT, BastType.MUTATION, BastType.PROCUREMENT];
// Which BAST types show target location
const NEEDS_LOCATION: BastType[] = [BastType.ASSIGNMENT, BastType.MUTATION, BastType.RETURN, BastType.MAINTENANCE_IN, BastType.PROCUREMENT];
// For these types, fetch only AVAILABLE assets
const AVAILABLE_ONLY_TYPES: BastType[] = [BastType.ASSIGNMENT, BastType.MUTATION, BastType.DISPOSAL, BastType.MAINTENANCE_OUT, BastType.PROCUREMENT, BastType.STOCK_OPNAME];

export function CreateBastDialog({ open, onOpenChange, onSuccess }: CreateBastDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    type: "" as BastType | "",
    recipientName: "",
    recipientPosition: "",
    recipientUserId: "", // The system user who becomes the new holder
    targetLocationId: "", // Default target location for all items
    notes: "",
    loanStartDate: "",
    loanEndDate: "",
  });

  const filteredAssets = assets.filter((asset) => asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || asset.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()));

  const needsHolder = formData.type && NEEDS_HOLDER.includes(formData.type as BastType);
  const needsLocation = formData.type && NEEDS_LOCATION.includes(formData.type as BastType);
  const isLoan = formData.type === BastType.ASSIGNMENT;

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchLocations();
    }
  }, [open]);

  useEffect(() => {
    if (formData.type && open) {
      fetchAssetsByType(formData.type as BastType);
    }
  }, [formData.type, open]);

  const fetchAssetsByType = async (type: BastType) => {
    try {
      const status = AVAILABLE_ONLY_TYPES.includes(type) ? "AVAILABLE" : "IN_USE";
      const response = await fetch(`/api/assets?status=${status}&limit=200`);
      const data = await response.json();
      if (data.success) setAssets(data.data.assets);
    } catch {
      toast.error("Gagal memuat daftar aset");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users?limit=200");
      const data = await response.json();
      if (data.success) setUsers(data.data.users);
    } catch {
      console.error("Failed to fetch users");
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      const data = await response.json();
      if (data.success) setLocations(Array.isArray(data.data) ? data.data : []);
    } catch {
      console.error("Failed to fetch locations");
    }
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssets((prev) => (prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]));
  };

  const resetForm = () => {
    setFormData({
      type: "",
      recipientName: "",
      recipientPosition: "",
      recipientUserId: "",
      targetLocationId: "",
      notes: "",
      loanStartDate: "",
      loanEndDate: "",
    });
    setSelectedAssets([]);
    setSearchQuery("");
    setStep(1);
  };

  const handleSubmit = async () => {
    if (selectedAssets.length === 0) {
      toast.error("Pilih minimal 1 aset");
      return;
    }

    setLoading(true);
    try {
      // Resolve recipient name from selected user if needed
      let recipientName = formData.recipientName;
      let recipientPosition = formData.recipientPosition;

      if (needsHolder && formData.recipientUserId) {
        const selectedUser = users.find((u) => u.id === formData.recipientUserId);
        if (selectedUser) {
          recipientName = selectedUser.fullName;
          recipientPosition = selectedUser.role;
        }
      }

      const result = await createBast({
        type: formData.type as BastType,
        recipientName,
        recipientPosition,
        description: formData.notes,
        loanStartDate: isLoan && formData.loanStartDate ? new Date(formData.loanStartDate) : undefined,
        loanEndDate: isLoan && formData.loanEndDate ? new Date(formData.loanEndDate) : undefined,
        items: selectedAssets.map((assetId) => ({
          assetId,
          conditionAfter: AssetCondition.GOOD,
          targetLocationId: formData.targetLocationId || undefined,
          targetHolderId: formData.recipientUserId || undefined,
        })),
      });

      if (result.success) {
        toast.success(`BAST ${BAST_TYPE_LABELS[formData.type as string] || ""} berhasil dibuat!`);
        resetForm();
        onSuccess();
      } else {
        toast.error(result.error || "Gagal membuat BAST");
      }
    } catch {
      toast.error("Terjadi kesalahan server");
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = formData.type && formData.recipientName;
  const canSubmit = selectedAssets.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat BAST Baru</DialogTitle>
          <DialogDescription>
            Langkah {step} dari 2: {step === 1 ? "Informasi Dasar & Penerima" : "Pilih Aset"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-2">
          {["Info Dasar", "Pilih Aset"].map((label, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${step > i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="grid gap-4 py-2">
            {/* BAST Type */}
            <div className="grid gap-2">
              <Label>Tipe BAST *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => {
                  setFormData({ ...formData, type: value as BastType });
                  setSelectedAssets([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe BAST..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BAST_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient section */}
            <div className="border rounded-xl p-4 bg-muted/30 grid gap-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                {needsHolder ? "Diserahkan Kepada (Penanggung Jawab Baru)" : "Penerima / Kontak"}
              </p>

              {/* If type requires a system user as new holder, show user dropdown */}
              {needsHolder && (
                <div className="grid gap-2">
                  <Label className="text-xs">Pilih User Sistem (Penanggung Jawab)</Label>
                  <Select
                    value={formData.recipientUserId}
                    onValueChange={(v) => {
                      const u = users.find((u) => u.id === v);
                      setFormData({
                        ...formData,
                        recipientUserId: v,
                        recipientName: u?.fullName || formData.recipientName,
                        recipientPosition: u?.role || formData.recipientPosition,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pengguna sistem..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName} — {u.role} {u.division ? `(${u.division.name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs">Nama Penerima *</Label>
                  <Input value={formData.recipientName} onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })} placeholder="Nama penerima..." />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Jabatan / Posisi</Label>
                  <Input value={formData.recipientPosition} onChange={(e) => setFormData({ ...formData, recipientPosition: e.target.value })} placeholder="Staff IT, Manager, dll." />
                </div>
              </div>
            </div>

            {/* Target location */}
            {needsLocation && (
              <div className="border rounded-xl p-4 bg-muted/30 grid gap-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Lokasi Tujuan / Penempatan
                </p>
                <Select value={formData.targetLocationId} onValueChange={(v) => setFormData({ ...formData, targetLocationId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lokasi..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak Diubah —</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Loan dates if ASSIGNMENT */}
            {isLoan && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs">Tanggal Serah Terima</Label>
                  <Input type="date" value={formData.loanStartDate} onChange={(e) => setFormData({ ...formData, loanStartDate: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Estimasi Pengembalian (Opsional)</Label>
                  <Input type="date" value={formData.loanEndDate} onChange={(e) => setFormData({ ...formData, loanEndDate: e.target.value })} />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <Label>Keterangan / Catatan</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Tujuan peminjaman, kondisi khusus, dll." />
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="grid gap-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{selectedAssets.length} aset dipilih</p>
              <Badge variant="secondary">{filteredAssets.length} aset tersedia</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cari aset berdasarkan nama atau tag..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="border rounded-lg divide-y max-h-[420px] overflow-y-auto">
              {filteredAssets.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">{assets.length === 0 ? "Pilih tipe BAST terlebih dahulu untuk memuat daftar aset yang relevan." : "Tidak ada aset yang cocok dengan pencarian."}</div>
              ) : (
                filteredAssets.map((asset) => (
                  <div key={asset.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${selectedAssets.includes(asset.id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={() => toggleAsset(asset.id)}>
                    <Checkbox checked={selectedAssets.includes(asset.id)} onCheckedChange={() => toggleAsset(asset.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.tagNumber} · {asset.category?.name} · {asset.location?.name || "Tanpa Lokasi"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={asset.status === "AVAILABLE" ? "default" : "secondary"} className="text-[10px]">
                        {asset.status}
                      </Badge>
                      <Badge variant={asset.condition === "GOOD" ? "outline" : "destructive"} className="text-[10px]">
                        {asset.condition}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step === 2 && (
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 size-4" />
                Kembali
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Batal
            </Button>
            {step === 1 ? (
              <Button onClick={() => setStep(2)} disabled={!canProceedToStep2}>
                Pilih Aset
                <ChevronRight className="ml-2 size-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {loading ? "Menyimpan..." : `Buat BAST (${selectedAssets.length} aset)`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
