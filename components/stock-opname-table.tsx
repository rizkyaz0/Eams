"use client";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface StockOpname {
  id: string;
  title: string;
  frequency: string;
  startDate: string | Date;
  endDate: string | Date | null;
  status: string;
  notes: string | null;
  createdBy: { fullName: string };
  _count: { items: number };
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = { SCHEDULED: "outline", IN_PROGRESS: "default", COMPLETED: "secondary", CANCELLED: "destructive" };
const statusLabels: Record<string, string> = { SCHEDULED: "Terjadwal", IN_PROGRESS: "Berjalan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan" };
const freqLabels: Record<string, string> = { MONTHLY: "Bulanan", BIWEEKLY: "2 Mingguan" };

export function StockOpnameTable({ data }: { data: StockOpname[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const filtered = data.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
  const handleComplete = async (id: string) => {
    try { const r = await fetch(`/api/stock-opname/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "COMPLETED" }) }); const d = await r.json(); if (d.success) { toast.success("Stock opname selesai"); router.refresh(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Hapus sesi stock opname ini?")) return;
    try { const r = await fetch(`/api/stock-opname/${id}`, { method: "DELETE" }); const d = await r.json(); if (d.success) { toast.success("Dihapus"); router.refresh(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); }
  };
  return (
    <div className="space-y-4">
      <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari sesi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-full max-w-xs" /></div>
      <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Judul</TableHead><TableHead>Frekuensi</TableHead><TableHead>Mulai</TableHead><TableHead>Selesai</TableHead><TableHead className="text-center">Item</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="h-24 text-center">Tidak ada data.</TableCell></TableRow> : filtered.map((s) => (
          <TableRow key={s.id}><TableCell className="font-medium">{s.title}</TableCell><TableCell><Badge variant="outline">{freqLabels[s.frequency] || s.frequency}</Badge></TableCell><TableCell>{new Date(s.startDate).toLocaleDateString("id-ID")}</TableCell><TableCell>{s.endDate ? new Date(s.endDate).toLocaleDateString("id-ID") : "-"}</TableCell><TableCell className="text-center">{s._count.items}</TableCell><TableCell><Badge variant={statusVariants[s.status] || "outline"}>{statusLabels[s.status] || s.status}</Badge></TableCell>
            <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Aksi</DropdownMenuLabel>{s.status === "IN_PROGRESS" && <DropdownMenuItem onClick={() => handleComplete(s.id)}><CheckCircle className="mr-2 h-4 w-4" /> Selesaikan</DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(s.id)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>
        ))}</TableBody></Table></div>
    </div>
  );
}