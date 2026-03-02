"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface CreateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories: any[];
}

export function CreateAssetDialog({ open, onOpenChange, onSuccess, categories }: CreateAssetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tagNumber: "",
    categoryId: "",
    purchaseDate: "",
    purchasePrice: "",
    description: "",
  });

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
      // 1. Create the asset first to get the ID
      const assetResponse = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        }),
      });

      const assetData = await assetResponse.json();

      if (!assetData.success) {
        toast.error(assetData.error || "Failed to create asset");
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
          toast.warning("Asset created but image upload failed");
        }
      }

      toast.success("Asset created successfully");
      setFormData({
        name: "",
        tagNumber: "",
        categoryId: "",
        purchaseDate: "",
        purchasePrice: "",
        description: "",
      });
      setImage(null);
      setImagePreview(null);
      onSuccess();
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Asset</DialogTitle>
          <DialogDescription>Add a new asset to your inventory</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="flex flex-col items-center justify-center gap-4 mb-4">
              <Label htmlFor="image-upload" className="cursor-pointer group relative">
                <div className="size-32 rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center transition-all group-hover:border-primary/50 group-hover:bg-primary/5 overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="size-full object-cover" />
                  ) : (
                    <>
                      <Camera className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-wider">Upload Photo</span>
                    </>
                  )}
                </div>
                {imagePreview && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <Camera className="size-6 text-white" />
                  </div>
                )}
              </Label>
              <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
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

            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })} required>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="purchaseDate">Purchase Date *</Label>
                <Input id="purchaseDate" type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input id="purchasePrice" type="number" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} placeholder="0" />
              </div>
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
              Create Asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
