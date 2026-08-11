"use client";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Check, X, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AssetLoan { id: string; startDate: string | Date; endDate: string | Date; returnDate: string | Date | null; status: string; notes: string | null; asset: { name: string; tagNumber: string }; borrower: { fullName: string }; approvedBy: { fullName: string } | null; }
const statusLabels: Record<string, string> = { PENDING: "Menunggu", APPROVED: "Disetujui", REJECTED: "Ditolak", ACTIVE: "Aktif", RETURNED: "Dikembalikan", OVERDUE: "Terlambat" };
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = { PENDING: "secondary", APPROVED: "default", REJECTED: "destructive", ACTIVE: "default", RETURNED: "outline", OVERDUE: "destructive" };

export function AssetLoansTable({ data }: { data: AssetLoan[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const filtered = data.filter((l) => l.asset.name.toLowerCase().includes(search.toLowerCase()) || l.borrower.fullName.toLowerCase().includes(search.toLowerCase()));
  const updateStatus = async (id: string, status: string) => { try { const r = await fetch(`/api/asset-loans/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const d = await r.json(); if (d.success) { toast.success(`Pinjaman ${statusLabels[status]?.toLowerCase() || status}`); router.refresh(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); } };
  const handleDelete = async (id: string) => { if (!confirm("Hapus data pinjaman ini?")) return; try { const r = await fetch(`/api/asset-loans/${id}`, { method: "DELETE" }); const d = await r.json(); if (d.success) { toast.success("Dihapus"); router.refresh(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); } };
  return (
    <div className="space-y-4"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari aset atau peminjam..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-full max-w-xs" /></div>
      <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Aset</TableHead><TableHead>Peminjam</TableHead><TableHead>Mulai</TableHead><TableHead>Selesai</TableHead><TableHead>Dikembalikan</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="h-24 text-center">Tidak ada data.</TableCell></TableRow> : filtered.map((l) => (
          <TableRow key={l.id}><TableCell className="font-medium">{l.asset.name}<br /><span className="text-xs text-muted-foreground">{l.asset.tagNumber}</span></TableCell><TableCell>{l.borrower.fullName}</TableCell><TableCell>{new Date(l.startDate).toLocaleDateString("id-ID")}</TableCell><TableCell>{new Date(l.endDate).toLocaleDateString("id-ID")}</TableCell><TableCell>{l.returnDate ? new Date(l.returnDate).toLocaleDateString("id-ID") : "-"}</TableCell><TableCell><Badge variant={statusVariants[l.status] || "outline"}>{statusLabels[l.status] || l.status}</Badge></TableCell>
            <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Aksi</DropdownMenuLabel>{l.status === "PENDING" && <><DropdownMenuItem onClick={() => updateStatus(l.id, "APPROVED")}><Check className="mr-2 h-4 w-4" /> Setujui</DropdownMenuItem><DropdownMenuItem onClick={() => updateStatus(l.id, "REJECTED")}><X className="mr-2 h-4 w-4" /> Tolak</DropdownMenuItem></>}{l.status === "APPROVED" && <DropdownMenuItem onClick={() => updateStatus(l.id, "RETURNED")}><RotateCcw className="mr-2 h-4 w-4" /> Tandai Dikembalikan</DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(l.id)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>
        ))}</TableBody></Table></div></div>
  );
}