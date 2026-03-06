"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Building2, Users, Box, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDivision, setEditingDivision] = useState<any>(null);
  const [deletingDivision, setDeletingDivision] = useState<any>(null);

  const [form, setForm] = useState({ code: "", name: "", description: "" });

  useEffect(() => {
    fetchDivisions();
  }, []);

  const fetchDivisions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/divisions");
      const data = await res.json();
      if (data.success) setDivisions(Array.isArray(data.data) ? data.data : []);
    } catch {
      toast.error("Gagal memuat divisi");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingDivision(null);
    setForm({ code: "", name: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (div: any) => {
    setEditingDivision(div);
    setForm({ code: div.code, name: div.name, description: div.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name) return toast.error("Kode dan nama divisi wajib diisi");
    setSaving(true);
    try {
      const url = editingDivision ? `/api/divisions/${editingDivision.id}` : "/api/divisions";
      const method = editingDivision ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success(editingDivision ? "Divisi diperbarui!" : "Divisi berhasil dibuat!");
      setDialogOpen(false);
      fetchDivisions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (div: any) => {
    setDeletingDivision(div);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingDivision) return;
    try {
      const res = await fetch(`/api/divisions/${deletingDivision.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      toast.success("Divisi dihapus!");
      setDeleteDialogOpen(false);
      fetchDivisions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Divisi</h1>
          <p className="text-muted-foreground mt-1">Kelola divisi / unit kerja dalam organisasi Anda.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Tambah Divisi
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : divisions.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="size-16 text-muted-foreground mb-4 opacity-30" />
            <h2 className="text-xl font-bold">Belum Ada Divisi</h2>
            <p className="text-muted-foreground max-w-xs mt-2 text-sm">Tambah divisi pertama untuk mengategorikan pengguna dan aset per unit kerja.</p>
            <Button className="mt-6" onClick={openCreate}>
              Tambah Divisi Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {divisions.map((div) => (
            <Card key={div.id} className="hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{div.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs font-mono">
                        {div.code}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(div)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => confirmDelete(div)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {div.description && <CardDescription className="text-sm mt-2">{div.description}</CardDescription>}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="size-4" />
                    <span>{div._count?.users ?? 0} pengguna</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Box className="size-4" />
                    <span>{div._count?.assets ?? 0} aset</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingDivision ? "Edit Divisi" : "Tambah Divisi Baru"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Kode Divisi *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Contoh: IT, HRD, KEUANGAN" disabled={!!editingDivision} />
            </div>
            <div className="grid gap-2">
              <Label>Nama Divisi *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Divisi Teknologi Informasi" />
            </div>
            <div className="grid gap-2">
              <Label>Deskripsi</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Hapus Divisi?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anda akan menghapus divisi <strong>{deletingDivision?.name}</strong>. Pengguna dan aset yang terdaftar di divisi ini tidak akan terhapus, namun divisi mereka akan kosong.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
