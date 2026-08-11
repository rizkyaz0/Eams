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

interface RoomConditionReport {
  id: string;
  condition: string;
  description: string;
  status: string;
  resolution: string | null;
  createdAt: string | Date;
  resolvedAt: string | Date | null;
  location: { id: string; name: string };
  reportedBy: { id: string; fullName: string; email: string };
  resolvedBy: { id: string; fullName: string } | null;
}

interface RoomReportsTableProps {
  data: RoomConditionReport[];
}

const conditionLabels: Record<string, string> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Kerusakan Ringan",
  MAJOR_DAMAGE: "Kerusakan Berat",
  NEEDS_REPAIR: "Perlu Perbaikan",
};

const conditionVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  GOOD: "outline",
  MINOR_DAMAGE: "secondary",
  MAJOR_DAMAGE: "destructive",
  NEEDS_REPAIR: "destructive",
};

const statusLabels: Record<string, string> = {
  OPEN: "Terbuka",
  IN_PROGRESS: "Dalam Proses",
  RESOLVED: "Selesai",
};

export function RoomReportsTable({ data }: RoomReportsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredData = data.filter(
    (item) =>
      item.location.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.reportedBy.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/room-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Laporan ditandai selesai");
        router.refresh();
      } else {
        toast.error(result.error || "Gagal menyelesaikan laporan");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus laporan kondisi ruangan ini?")) return;
    try {
      const res = await fetch(`/api/room-reports/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast.success("Laporan dihapus");
        router.refresh();
      } else {
        toast.error(result.error || "Gagal menghapus");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari ruangan, deskripsi, atau pelapor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-full max-w-xs" />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ruangan</TableHead>
              <TableHead>Kondisi</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Pelapor</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Tidak ada laporan.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.location.name}</TableCell>
                  <TableCell>
                    <Badge variant={conditionVariants[report.condition] || "outline"}>
                      {conditionLabels[report.condition] || report.condition}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate">{report.description}</TableCell>
                  <TableCell>{report.reportedBy.fullName}</TableCell>
                  <TableCell>{new Date(report.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                  <TableCell>
                    <Badge variant={report.status === "RESOLVED" ? "outline" : report.status === "IN_PROGRESS" ? "secondary" : "destructive"}>
                      {statusLabels[report.status] || report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        {report.status !== "RESOLVED" && (
                          <DropdownMenuItem onClick={() => handleResolve(report.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Tandai Selesai
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(report.id)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}