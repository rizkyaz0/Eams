"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NewStockTakePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [auditorId, setAuditorId] = useState("");
  const [locationId, setLocationId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");

  const [users, setUsers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    // Fetch filter options
    Promise.all([fetch("/api/users").then((res) => res.json()), fetch("/api/locations").then((res) => res.json()), fetch("/api/categories").then((res) => res.json())])
      .then(([usersData, locData, catData]) => {
        if (usersData.success) setUsers(usersData.data.users || []);
        if (locData.success) setLocations(locData.data);
        if (catData.success) setCategories(catData.data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Gagal memanggil data referensi filter.");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !auditorId) {
      return toast.error("Judul Opname dan Auditor Wajib Diisi.");
    }
    setLoading(true);

    try {
      const payload = {
        title,
        auditorId,
        ...(locationId !== "all" && { locationId }),
        ...(categoryId !== "all" && { categoryId }),
      };

      const res = await fetch("/api/stocktake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Audit Stock-Take Berhasil Dirilis!");
        router.push("/stocktake");
      } else {
        toast.error(data.error || "Gagal membuat Stock-Take");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-10 w-full max-w-3xl mx-auto border-t">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/stocktake")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rilis Sesi Opname</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Delegasikan lembar tugas audit inventaris.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spesifikasi Target Audit</CardTitle>
          <CardDescription>Jika Lokasi atau Kategori diset Semua, sistem akan menarik seluruh aset perusahaan tanpa bocoran Qty asli ke UI petugas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Nama Penugasan (Judul)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Audit Tahunan - Gudang Selatan 2026" required />
            </div>
            <div className="space-y-2">
              <Label>Petugas Auditor</Label>
              <Select value={auditorId} onValueChange={setAuditorId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih user yang bertugas..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Petugas yang dipilih akan mengisi form rekonsiliasi lewat seluler M-Opname mereka.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Filter Lokasi (Opsional)</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seluruh Lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Lokasi</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filter Kategori (Opsional)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seluruh Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Generate Blind-Audit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
