"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RoomUsageLog {
  id: string;
  locationId: string;
  userId: string;
  startTime: string | Date;
  endTime: string | Date | null;
  purpose: string;
  notes: string | null;
  location: { id: string; name: string };
  user: { id: string; fullName: string; email: string };
}

interface RoomUsageTableProps {
  data: RoomUsageLog[];
}

export function RoomUsageTable({ data }: RoomUsageTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredData = data.filter(
    (item) =>
      item.location.name.toLowerCase().includes(search.toLowerCase()) ||
      item.purpose.toLowerCase().includes(search.toLowerCase()) ||
      item.user.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleEndSession = async (id: string) => {
    try {
      const res = await fetch(`/api/room-usage/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endTime: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Sesi penggunaan ruangan diakhiri");
        router.refresh();
      } else {
        toast.error(data.error || "Gagal mengakhiri sesi");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus log penggunaan ruangan ini?")) return;
    try {
      const res = await fetch(`/api/room-usage/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Log dihapus");
        router.refresh();
      } else {
        toast.error(data.error || "Gagal menghapus");
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
          <Input placeholder="Cari ruangan, keperluan, atau pengguna..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-full max-w-xs" />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ruangan</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Keperluan</TableHead>
              <TableHead>Mulai</TableHead>
              <TableHead>Selesai</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Tidak ada data.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.location.name}</TableCell>
                  <TableCell>{log.user.fullName}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{log.purpose}</TableCell>
                  <TableCell>{new Date(log.startTime).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                  <TableCell>{log.endTime ? new Date(log.endTime).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-"}</TableCell>
                  <TableCell>
                    {log.endTime ? (
                      <Badge variant="outline">Selesai</Badge>
                    ) : (
                      <Badge variant="default">Aktif</Badge>
                    )}
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
                        {!log.endTime && (
                          <DropdownMenuItem onClick={() => handleEndSession(log.id)}>
                            <Square className="mr-2 h-4 w-4" /> Akhiri Sesi
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(log.id)} className="text-red-600 focus:text-red-600">
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