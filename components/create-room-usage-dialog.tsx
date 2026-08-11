"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateRoomUsageDialogProps {
  locations: { id: string; name: string }[];
}

export function CreateRoomUsageDialog({ locations }: CreateRoomUsageDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    locationId: "",
    purpose: "",
    notes: "",
  });

  async function handleSubmit() {
    if (!formData.locationId || !formData.purpose) {
      toast.error("Ruangan dan keperluan wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/room-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: formData.locationId,
          purpose: formData.purpose,
          notes: formData.notes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Log penggunaan ruangan dibuat");
        setFormData({ locationId: "", purpose: "", notes: "" });
        setOpen(false);
        window.location.reload();
      } else {
        toast.error(data.error || "Gagal membuat log");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Catat Penggunaan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Penggunaan Ruangan</DialogTitle>
          <DialogDescription>Buat log pemakaian ruangan baru. Tanggal otomatis tercatat.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="location">Ruangan *</Label>
            <Select value={formData.locationId} onValueChange={(value) => setFormData({ ...formData, locationId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih ruangan" />
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
          <div className="grid gap-2">
            <Label htmlFor="purpose">Keperluan *</Label>
            <Input id="purpose" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="Rapat, presentasi, dll" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Catatan tambahan (opsional)" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}