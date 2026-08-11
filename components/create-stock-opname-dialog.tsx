"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function CreateStockOpnameDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: "", frequency: "MONTHLY", startDate: "", notes: "" });
  const handleSubmit = async () => {
    if (!formData.title || !formData.startDate) { toast.error("Judul dan tanggal mulai wajib diisi"); return; }
    setLoading(true);
    try { const r = await fetch("/api/stock-opname", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) }); const d = await r.json(); if (d.success) { toast.success("Stock opname dibuat"); setOpen(false); setFormData({ title: "", frequency: "MONTHLY", startDate: "", notes: "" }); window.location.reload(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Buat Stock Opname</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Buat Sesi Stock Opname</DialogTitle><DialogDescription>Semua aset aktif akan otomatis dimasukkan sebagai item pemeriksaan.</DialogDescription></DialogHeader>
      <div className="space-y-4"><div className="grid gap-2"><Label htmlFor="title">Judul *</Label><Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Stock Opname Agustus 2026" /></div>
        <div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label htmlFor="frequency">Frekuensi *</Label><Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MONTHLY">Bulanan</SelectItem><SelectItem value="BIWEEKLY">2 Mingguan</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label htmlFor="startDate">Tanggal Mulai *</Label><Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} /></div></div>
        <div className="grid gap-2"><Label htmlFor="notes">Catatan</Label><Input id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Opsional" /></div></div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button><Button onClick={handleSubmit} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat</Button></DialogFooter></DialogContent></Dialog>
  );
}