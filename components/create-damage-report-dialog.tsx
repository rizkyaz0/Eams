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

export function CreateDamageReportDialog({ assets }: { assets: { id: string; name: string; tagNumber: string }[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ assetId: "", condition: "", description: "" });
  const handleSubmit = async () => {
    if (!formData.assetId || !formData.condition || !formData.description) { toast.error("Semua field wajib diisi"); return; }
    setLoading(true);
    try { const r = await fetch("/api/damage-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) }); const d = await r.json(); if (d.success) { toast.success("Laporan dibuat"); setOpen(false); setFormData({ assetId: "", condition: "", description: "" }); window.location.reload(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Lapor Kerusakan</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Laporan Barang Rusak</DialogTitle><DialogDescription>Laporkan kerusakan aset.</DialogDescription></DialogHeader>
      <div className="space-y-4"><div className="grid gap-2"><Label htmlFor="asset">Aset *</Label><Select value={formData.assetId} onValueChange={(v) => setFormData({ ...formData, assetId: v })}><SelectTrigger><SelectValue placeholder="Pilih aset" /></SelectTrigger><SelectContent>{assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.tagNumber})</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2"><Label htmlFor="condition">Kondisi *</Label><Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}><SelectTrigger><SelectValue placeholder="Pilih kondisi" /></SelectTrigger><SelectContent><SelectItem value="MINOR_DAMAGE">Rusak Ringan</SelectItem><SelectItem value="MAJOR_DAMAGE">Rusak Berat</SelectItem><SelectItem value="TOTAL_LOSS">Total Loss</SelectItem></SelectContent></Select></div>
        <div className="grid gap-2"><Label htmlFor="description">Deskripsi *</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Jelaskan kerusakan..." /></div></div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button><Button onClick={handleSubmit} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim</Button></DialogFooter></DialogContent></Dialog>
  );
}