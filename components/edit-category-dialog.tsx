"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  category: any;
}

export function EditCategoryDialog({ open, onOpenChange, onSuccess, category }: EditCategoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName]         = useState("");
  const [code, setCode]         = useState("");
  const [description, setDesc]  = useState("");

  useEffect(() => {
    if (category) {
      setName(category.name || "");
      setCode(category.code || "");
      setDesc(category.description || "");
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code: code.toUpperCase() || undefined, description: description || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Kategori berhasil diperbarui");
        onSuccess();
      } else {
        toast.error(data.error || "Gagal memperbarui kategori");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Kategori</DialogTitle>
            <DialogDescription>Perbarui detail kategori aset.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ecat-name">Nama Kategori *</Label>
              <Input id="ecat-name" value={name} onChange={e => setName(e.target.value)} placeholder="Elektronik..." required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ecat-code">
                Kode Kategori <span className="text-xs text-muted-foreground">(untuk QR Code, contoh: EL, FR)</span>
              </Label>
              <Input
                id="ecat-code"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="EL"
                maxLength={10}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ecat-desc">Deskripsi <span className="text-xs text-muted-foreground">(opsional)</span></Label>
              <Textarea id="ecat-desc" value={description} onChange={e => setDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
