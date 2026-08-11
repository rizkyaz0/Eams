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

export function CreateAssetLoanDialog({ assets, users }: { assets: { id: string; name: string; tagNumber: string }[]; users: { id: string; fullName: string; email: string }[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ assetId: "", borrowerId: "", startDate: "", endDate: "", notes: "" });
  const handleSubmit = async () => {
    if (!formData.assetId || !formData.borrowerId || !formData.startDate || !formData.endDate) { toast.error("Semua field wajib diisi"); return; }
    setLoading(true);
    try { const r = await fetch("/api/asset-loans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, notes: formData.notes || null }) }); const d = await r.json(); if (d.success) { toast.success("Permintaan pinjaman dibuat"); setOpen(false); setFormData({ assetId: "", borrowerId: "", startDate: "", endDate: "", notes: "" }); window.location.reload(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Pinjam Barang</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Pinjam Aset</DialogTitle><DialogDescription>Buat permintaan peminjaman aset.</DialogDescription></DialogHeader>
      <div className="space-y-4"><div className="grid gap-2"><Label htmlFor="asset">Aset *</Label><Select value={formData.assetId} onValueChange={(v) => setFormData({ ...formData, assetId: v })}><SelectTrigger><SelectValue placeholder="Pilih aset tersedia" /></SelectTrigger><SelectContent>{assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.tagNumber})</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2"><Label htmlFor="borrower">Peminjam *</Label><Select value={formData.borrowerId} onValueChange={(v) => setFormData({ ...formData, borrowerId: v })}><SelectTrigger><SelectValue placeholder="Pilih peminjam" /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.email})</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label htmlFor="startDate">Tanggal Mulai *</Label><Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} /></div><div className="grid gap-2"><Label htmlFor="endDate">Tanggal Selesai *</Label><Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} /></div></div>
        <div className="grid gap-2"><Label htmlFor="notes">Catatan</Label><Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Opsional" /></div></div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button><Button onClick={handleSubmit} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat</Button></DialogFooter></DialogContent></Dialog>
  );
}