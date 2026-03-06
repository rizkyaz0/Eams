"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

interface CreateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories: any[];
  locations?: any[];
}

export function CreateAssetDialog({ open, onOpenChange, onSuccess, categories, locations = [] }: CreateAssetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tagNumber: "",
    categoryId: "",
    locationId: "",
    purchaseDate: "",
    purchasePrice: "",
    salvageValue: "",
    usefulLife: "",
    rfidData: "",
    description: "",
  });

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        tagNumber: "",
        categoryId: "",
        locationId: "",
        purchaseDate: "",
        purchasePrice: "",
        salvageValue: "",
        usefulLife: "",
        rfidData: "",
        description: "",
      });
      setImage(null);
      setImagePreview(null);
    }
  }, [open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.tagNumber || !formData.categoryId || !formData.purchaseDate) {
      toast.error("Nama, tag number, kategori, dan tanggal pembelian wajib diisi");
      return;
    }

    setLoading(true);

    try {
      // 1. Create the asset first to get the ID
      const assetResponse = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          tagNumber: formData.tagNumber,
          categoryId: formData.categoryId,
          locationId: formData.locationId || undefined,
          purchaseDate: formData.purchaseDate,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
          salvageValue: formData.salvageValue ? parseFloat(formData.salvageValue) : undefined,
          usefulLife: formData.usefulLife ? parseInt(formData.usefulLife) : undefined,
          rfidData: formData.rfidData || undefined,
          description: formData.description || undefined,
        }),
      });

      const assetData = await assetResponse.json();

      if (!assetData.success) {
        toast.error(assetData.error || "Gagal membuat aset");
        return;
      }

      const assetId = assetData.data.id;

      // 2. If there is an image, upload it
      if (image) {
        const imageFormData = new FormData();
        imageFormData.append("file", image);

        const uploadResponse = await fetch(`/api/assets/${assetId}/images`, {
          method: "POST",
          body: imageFormData,
        });

        const uploadData = await uploadResponse.json();
        if (!uploadData.success) {
          toast.warning("Aset berhasil dibuat, tapi foto gagal diupload");
        }
      }

      toast.success("Aset berhasil dibuat!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Terjadi kesalahan, silakan coba lagi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Aset Baru</DialogTitle>
          <DialogDescription>Tambahkan aset baru ke inventaris</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-2">
            {/* Image Upload */}
            <div className="flex flex-col items-center justify-center gap-2">
              <Label htmlFor="image-upload" className="cursor-pointer group relative">
                <div className="size-28 rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center transition-all group-hover:border-primary/50 group-hover:bg-primary/5 overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="size-full object-cover" />
                  ) : (
                    <>
                      <Camera className="size-7 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">Upload Foto</span>
                    </>
                  )}
                </div>
              </Label>
              <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Opsional · Rasio 1:1 disarankan</p>
            </div>

            {/* Name + Tag Number */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Aset *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Laptop Dell Inspiron" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tagNumber">Tag Number *</Label>
                <Input id="tagNumber" value={formData.tagNumber} onChange={(e) => setFormData({ ...formData, tagNumber: e.target.value })} placeholder="IT-001" required />
              </div>
            </div>

            {/* Category + Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Kategori *</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Lokasi Aset</Label>
                <Select value={formData.locationId} onValueChange={(v) => setFormData({ ...formData, locationId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lokasi..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tanpa Lokasi —</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Purchase Date + Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="purchaseDate">Tanggal Pembelian *</Label>
                <Input id="purchaseDate" type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchasePrice">Harga Beli (Rp)</Label>
                <Input id="purchasePrice" type="number" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} placeholder="0" />
              </div>
            </div>

            {/* Salvage Value + Useful Life */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="salvageValue">Nilai Sisa / Salvage (Rp)</Label>
                <Input id="salvageValue" type="number" value={formData.salvageValue} onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="usefulLife">Masa Pakai (Bulan)</Label>
                <Input id="usefulLife" type="number" value={formData.usefulLife} onChange={(e) => setFormData({ ...formData, usefulLife: e.target.value })} placeholder="60" />
              </div>
            </div>

            {/* RFID */}
            <div className="grid gap-2">
              <Label htmlFor="rfidData">RFID / EPC Tag (Opsional)</Label>
              <Input id="rfidData" value={formData.rfidData} onChange={(e) => setFormData({ ...formData, rfidData: e.target.value })} placeholder="E2003411B802011820051B79" />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Keterangan</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Spesifikasi, kondisi awal, dll." />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? "Menyimpan..." : "Buat Aset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
