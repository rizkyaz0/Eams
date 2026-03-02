"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Activity, FileText, Wrench, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface HistoryItem {
  id: string;
  type: string;
  date: string;
  title: string;
  description: string;
  user: string;
  status: string;
  link: string;
}

export function HistoryClient({ initialData }: { initialData: HistoryItem[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filter data
  const filteredData = initialData.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase()) || item.user.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "ALL" || item.type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / limit);
  const paginatedData = filteredData.slice((page - 1) * limit, page * limit);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-10 mx-auto w-full">
      <div className="flex items-center gap-2">
        <Activity className="size-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Riwayat Aktivitas</h1>
          <p className="text-muted-foreground mt-1">Timeline aktivitas aset, peminjaman, dan perbaikan system.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
          <CardTitle>Log Data</CardTitle>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari aktivitas..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Tipe</SelectItem>
                <SelectItem value="BAST">BAST</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Waktu</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Aktivitas</TableHead>
                  <TableHead>Pelaku / User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Tidak ada aktivitas ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell className="font-medium text-muted-foreground">{format(new Date(item.date), "dd MMM yyyy, HH:mm", { locale: idLocale })}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.type === "BAST" ? <FileText className="size-4 text-blue-500" /> : <Wrench className="size-4 text-orange-500" />}
                          <span className="font-medium">{item.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                      </TableCell>
                      <TableCell>{item.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={item.link}>
                            <ExternalLink className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Menampilkan {(page - 1) * limit + 1} hingga {Math.min(page * limit, filteredData.length)} dari {filteredData.length} data
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                  <ChevronLeft className="size-4 mr-1" /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
