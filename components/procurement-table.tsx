"use client";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Check, X, Trash2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ProcurementRequest { id: string; itemName: string; quantity: number; unit: string | null; estimatedPrice: any; supplier: string | null; status: string; notes: string | null; maintenance: { description: string; asset: { name: string; tagNumber: string } } | null; requestedBy: { fullName: string }; approvedBy: { fullName: string } | null; }
const statusLabels: Record<string, string> = { PENDING: "Menunggu", APPROVED: "Disetujui", ORDERED: "Dipesan", RECEIVED: "Diterima", CANCELLED: "Dibatalkan" };
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = { PENDING: "secondary", APPROVED: "default", ORDERED: "default", RECEIVED: "outline", CANCELLED: "destructive" };

export function ProcurementTable({ data }: { data: ProcurementRequest[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const filtered = data.filter((r) => r.itemName.toLowerCase().includes(search.toLowerCase()) || (r.supplier || "").toLowerCase().includes(search.toLowerCase()));
  const updateStatus = async (id: string, status: string) => { try { const r = await fetch(`/api/procurement/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const d = await r.json(); if (d.success) { toast.success(`Status: ${statusLabels[status] || status}`); router.refresh(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); } };
  const handleDelete = async (id: string) => { if (!confirm("Hapus permintaan pengadaan ini?")) return; try { const r = await fetch(`/api/procurement/${id}`, { method: "DELETE" }); const d = await r.json(); if (d.success) { toast.success("Dihapus"); router.refresh(); } else toast.error(d.error); } catch { toast.error("Terjadi kesalahan"); } };
  return (
    <div className="space-y-4"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari item atau supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-full max-w-xs" /></div>
      <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-center">Qty</TableHead><TableHead>Supplier</TableHead><TableHead>Estimasi Harga</TableHead><TableHead>Service MR</TableHead><TableHead>Peminta</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="h-24 text-center">Tidak ada data.</TableCell></TableRow> : filtered.map((r) => (
          <TableRow key={r.id}><TableCell className="font-medium">{r.itemName}</TableCell><TableCell className="text-center">{r.quantity}{r.unit ? ` ${r.unit}` : ""}</TableCell><TableCell>{r.supplier || "-"}</TableCell><TableCell>{r.estimatedPrice ? `Rp ${Number(r.estimatedPrice).toLocaleString("id-ID")}` : "-"}</TableCell><TableCell className="max-w-[150px] truncate">{r.maintenance ? `${r.maintenance.asset.name} - ${r.maintenance.description}` : "-"}</TableCell><TableCell>{r.requestedBy.fullName}</TableCell><TableCell><Badge variant={statusVariants[r.status] || "outline"}>{statusLabels[r.status] || r.status}</Badge></TableCell>
            <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Aksi</DropdownMenuLabel>{r.status === "PENDING" && <DropdownMenuItem onClick={() => updateStatus(r.id, "APPROVED")}><Check className="mr-2 h-4 w-4" /> Setujui</DropdownMenuItem>}{r.status === "APPROVED" && <DropdownMenuItem onClick={() => updateStatus(r.id, "ORDERED")}><PackageCheck className="mr-2 h-4 w-4" /> Dipesan</DropdownMenuItem>}{r.status === "ORDERED" && <DropdownMenuItem onClick={() => updateStatus(r.id, "RECEIVED")}><PackageCheck className="mr-2 h-4 w-4" /> Diterima</DropdownMenuItem>}{r.status !== "RECEIVED" && r.status !== "CANCELLED" && <DropdownMenuItem onClick={() => updateStatus(r.id, "CANCELLED")}><X className="mr-2 h-4 w-4" /> Batalkan</DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(r.id)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>
        ))}</TableBody></Table></div></div>
  );
}