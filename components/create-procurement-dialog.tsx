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

export function CreateProcurementDialog({ maintenances }: { maintenances: { id: string; description: string; asset: { name: string; tagNumber: string } }[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ maintenanceId: "", itemName: "", quantity: "1", unit: "", estimatedPrice: "", supplier: "", notes: "" });
  const handleSubmit = async () => {
    if (!formData.itemName) { toast.error("Nama item wajib diisi"); return; }
    setLoading(true);
    try { const r = await fetch("/api/procurement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maintenanceId: formData.maintenanceId || null, itemName: formData.itemName, quantity: parseInt(formData.quantity) || 1, unit: formData.unit || null, estimatedPrice: formData.estimatedPrice || null, supplier: formData.supplier || null, notes: formData.notes || null }) }); const d = await r.json(); if (d.success) { toast.success("Permintaan pengadaan dibuat"); setOpen(false); setFormData({ maintenanceId: "", itemName: "", quantity: "1", unit: "", estimatedPrice: "", supplier: "", notes: "" }); window.location.reload(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Buat Pengadaan</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Pengadaan untuk Service</DialogTitle><DialogDescription>Buat permintaan pengadaan barang untuk maintenance.</DialogDescription></DialogHeader>
      <div className="space-y-4"><div className="grid gap-2"><Label htmlFor="maintenance">Service MR Terkait</Label><Select value={formData.maintenanceId} onValueChange={(v) => setFormData({ ...formData, maintenanceId: v })}><SelectTrigger><SelectValue placeholder="Pilih service (opsional)" /></SelectTrigger><SelectContent>{maintenances.map((m) => <SelectItem key={m.id} value={m.id}>{m.asset.name} - {m.description}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2"><Label htmlFor="itemName">Nama Item *</Label><Input id="itemName" value={formData.itemName} onChange={(e) => setFormData({ ...formData, itemName: e.target.value })} placeholder="Nama barang" /></div>
        <div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label htmlFor="quantity">Jumlah</Label><Input id="quantity" type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} /></div><div className="grid gap-2"><Label htmlFor="unit">Satuan</Label><Input id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="unit, pcs, set" /></div></div>
        <div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label htmlFor="estimatedPrice">Estimasi Harga</Label><Input id="estimatedPrice" type="number" value={formData.estimatedPrice} onChange={(e) => setFormData({ ...formData, estimatedPrice: e.target.value })} placeholder="0" /></div><div className="grid gap-2"><Label htmlFor="supplier">Supplier</Label><Input id="supplier" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} /></div></div>
        <div className="grid gap-2"><Label htmlFor="notes">Catatan</Label><Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Opsional" /></div></div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button><Button onClick={handleSubmit} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat</Button></DialogFooter></DialogContent></Dialog>
  );
}