"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCategoryDialog({ open, onOpenChange, onSuccess }: CreateCategoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName]         = useState("");
  const [code, setCode]         = useState("");
  const [description, setDesc]  = useState("");

  const reset = () => { setName(""); setCode(""); setDesc(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code: code.toUpperCase() || undefined, description: description || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Kategori berhasil dibuat");
        reset();
        onSuccess();
      } else {
        toast.error(data.error || "Gagal membuat kategori");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Kategori</DialogTitle>
            <DialogDescription>Tambah kategori aset baru.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-name">Nama Kategori *</Label>
              <Input id="cat-name" value={name} onChange={e => setName(e.target.value)} placeholder="Elektronik, Furnitur, Kendaraan..." required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-code">
                Kode Kategori <span className="text-xs text-muted-foreground">(digunakan untuk QR Code barang, contoh: EL, FR, KB)</span>
              </Label>
              <Input
                id="cat-code"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="EL"
                maxLength={10}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-desc">Deskripsi <span className="text-xs text-muted-foreground">(opsional)</span></Label>
              <Textarea id="cat-desc" value={description} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Deskripsi singkat kategori..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={loading}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tambah Kategori
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
