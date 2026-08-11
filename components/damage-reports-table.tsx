"use client";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DamageReport { id: string; condition: string; description: string; status: string; resolution: string | null; createdAt: string | Date; asset: { name: string; tagNumber: string }; reportedBy: { fullName: string }; resolvedBy: { fullName: string } | null; }
const condLabels: Record<string, string> = { GOOD: "Baik", MINOR_DAMAGE: "Rusak Ringan", MAJOR_DAMAGE: "Rusak Berat", TOTAL_LOSS: "Total Loss" };
const condVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = { GOOD: "outline", MINOR_DAMAGE: "secondary", MAJOR_DAMAGE: "destructive", TOTAL_LOSS: "destructive" };
const statusLabels: Record<string, string> = { OPEN: "Terbuka", IN_PROGRESS: "Dalam Proses", RESOLVED: "Selesai" };

export function DamageReportsTable({ data }: { data: DamageReport[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const filtered = data.filter((r) => r.asset.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()));
  const handleResolve = async (id: string) => { try { const r = await fetch(`/api/damage-reports/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "RESOLVED" }) }); const d = await r.json(); if (d.success) { toast.success("Laporan diselesaikan"); router.refresh(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); } };
  const handleDelete = async (id: string) => { if (!confirm("Hapus laporan ini?")) return; try { const r = await fetch(`/api/damage-reports/${id}`, { method: "DELETE" }); const d = await r.json(); if (d.success) { toast.success("Dihapus"); router.refresh(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); } };
  return (
    <div className="space-y-4"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari aset atau deskripsi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-full max-w-xs" /></div>
      <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Aset</TableHead><TableHead>Kondisi</TableHead><TableHead>Deskripsi</TableHead><TableHead>Pelapor</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="h-24 text-center">Tidak ada data.</TableCell></TableRow> : filtered.map((r) => (
          <TableRow key={r.id}><TableCell className="font-medium">{r.asset.name}<br /><span className="text-xs text-muted-foreground">{r.asset.tagNumber}</span></TableCell><TableCell><Badge variant={condVariants[r.condition] || "outline"}>{condLabels[r.condition] || r.condition}</Badge></TableCell><TableCell className="max-w-[200px] truncate">{r.description}</TableCell><TableCell>{r.reportedBy.fullName}</TableCell><TableCell>{new Date(r.createdAt).toLocaleDateString("id-ID")}</TableCell><TableCell><Badge variant={r.status === "RESOLVED" ? "outline" : r.status === "IN_PROGRESS" ? "secondary" : "destructive"}>{statusLabels[r.status] || r.status}</Badge></TableCell>
            <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Aksi</DropdownMenuLabel>{r.status !== "RESOLVED" && <DropdownMenuItem onClick={() => handleResolve(r.id)}><CheckCircle className="mr-2 h-4 w-4" /> Selesaikan</DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(r.id)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>
        ))}</TableBody></Table></div></div>
  );
}