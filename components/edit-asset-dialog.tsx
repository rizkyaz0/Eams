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

interface EditAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asset: any;
  categories: any[];
  locations: any[];
}

export function EditAssetDialog({ open, onOpenChange, onSuccess, asset, categories, locations }: EditAssetDialogProps) {
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
    status: "",
    condition: "",
  });

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || "",
        tagNumber: asset.tagNumber || "",
        categoryId: asset.categoryId || "",
        locationId: asset.locationId || "",
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.split("T")[0] : "",
        purchasePrice: asset.purchasePrice?.toString() || "",
        salvageValue: asset.salvageValue?.toString() || "",
        usefulLife: asset.usefulLife?.toString() || "",
        rfidData: asset.rfidData || "",
        description: asset.description || "",
        status: asset.status || "",
        condition: asset.condition || "",
      });
      setImagePreview(asset.imagePath || null);
    }
  }, [asset]);

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
    setLoading(true);

    try {
      // 1. Update the asset data
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          categoryId: formData.categoryId || undefined,
          locationId: formData.locationId || undefined,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
          salvageValue: formData.salvageValue ? parseFloat(formData.salvageValue) : undefined,
          usefulLife: formData.usefulLife ? parseInt(formData.usefulLife) : undefined,
          rfidData: formData.rfidData || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || "Failed to update asset");
        return;
      }

      // 2. If there is a NEW image, upload it
      if (image) {
        const imageFormData = new FormData();
        imageFormData.append("file", image);

        const uploadResponse = await fetch(`/api/assets/${asset.id}/images`, {
          method: "POST",
          body: imageFormData,
        });

        const uploadData = await uploadResponse.json();
        if (!uploadData.success) {
          toast.warning("Asset updated but image upload failed");
        }
      }

      toast.success("Asset updated successfully");
      setImage(null);
      onSuccess();
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
          <DialogDescription>Update asset information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="flex flex-col items-center justify-center gap-4 mb-4">
              <Label htmlFor="edit-image-upload" className="cursor-pointer group relative">
                <div className="size-32 rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center transition-all group-hover:border-primary/50 group-hover:bg-primary/5 overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="size-full object-cover" />
                  ) : (
                    <>
                      <Camera className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-wider">Change Photo</span>
                    </>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  <Camera className="size-6 text-white" />
                </div>
              </Label>
              <input id="edit-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Preferred: 1:1 Aspect Ratio (Square)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Asset Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tagNumber">Tag Number *</Label>
                <Input id="tagNumber" value={formData.tagNumber} onChange={(e) => setFormData({ ...formData, tagNumber: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
                <Label htmlFor="location">Location</Label>
                <Select value={formData.locationId} onValueChange={(value) => setFormData({ ...formData, locationId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="IN_USE">In Use</SelectItem>
                    <SelectItem value="IN_MAINTENANCE">In Maintenance</SelectItem>
                    <SelectItem value="MISSING">Missing</SelectItem>
                    <SelectItem value="DISPOSED">Disposed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="condition">Condition</Label>
                <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="MINOR_DAMAGE">Minor Damage</SelectItem>
                    <SelectItem value="MAJOR_DAMAGE">Major Damage</SelectItem>
                    <SelectItem value="TOTAL_LOSS">Total Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input id="purchaseDate" type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchasePrice">Purchase Price (Rp)</Label>
                <Input id="purchasePrice" type="number" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="salvageValue">Nilai Sisa / Salvage Value (Rp)</Label>
                <Input id="salvageValue" type="number" value={formData.salvageValue} onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="usefulLife">Masa Pakai / Useful Life (Bulan)</Label>
                <Input id="usefulLife" type="number" value={formData.usefulLife} onChange={(e) => setFormData({ ...formData, usefulLife: e.target.value })} placeholder="60" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rfidData">RFID / EPC Tag (Opsional)</Label>
              <Input id="rfidData" value={formData.rfidData} onChange={(e) => setFormData({ ...formData, rfidData: e.target.value })} placeholder="E2003411B802011820051B79" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update Asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
