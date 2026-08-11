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

interface CreateRoomReportDialogProps {
  locations: { id: string; name: string }[];
}

export function CreateRoomReportDialog({ locations }: CreateRoomReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    locationId: "",
    condition: "",
    description: "",
  });

  async function handleSubmit() {
    if (!formData.locationId || !formData.condition || !formData.description) {
      toast.error("Semua field wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/room-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Laporan kondisi ruangan dibuat");
        setFormData({ locationId: "", condition: "", description: "" });
        setOpen(false);
        window.location.reload();
      } else {
        toast.error(data.error || "Gagal membuat laporan");
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
          <Plus className="mr-2 h-4 w-4" /> Buat Laporan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Laporan Kondisi Ruangan</DialogTitle>
          <DialogDescription>Laporkan kerusakan atau kondisi ruangan.</DialogDescription>
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
            <Label htmlFor="condition">Kondisi *</Label>
            <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kondisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GOOD">Baik</SelectItem>
                <SelectItem value="MINOR_DAMAGE">Kerusakan Ringan</SelectItem>
                <SelectItem value="MAJOR_DAMAGE">Kerusakan Berat</SelectItem>
                <SelectItem value="NEEDS_REPAIR">Perlu Perbaikan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Deskripsi Kerusakan *</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Jelaskan kerusakan atau kondisi..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kirim Laporan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}