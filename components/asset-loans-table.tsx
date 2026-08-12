"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface AssetLoansTableProps {
  loans: any[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onReturn: (loan: any) => void;
  onDelete: (loan: any) => void;
}

const statusConfig = {
  ACTIVE: { label: "Aktif", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  RETURNED: { label: "Dikembalikan", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  OVERDUE: { label: "Terlambat", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

const limit = 10;

function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy", { locale: id });
}

export function AssetLoansTable({ loans, loading, page, total, onPageChange, onReturn, onDelete }: AssetLoansTableProps) {
  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <Card>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (loans.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <p className="text-lg font-semibold">Tidak ada data peminjaman</p>
          <p className="text-sm text-muted-foreground mt-1">Belum ada peminjaman aset yang tercatat</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aset</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Keperluan</TableHead>
                <TableHead>Tgl Pinjam</TableHead>
                <TableHead>Tgl Kembali (Rencana)</TableHead>
                <TableHead>Tgl Dikembalikan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat Oleh</TableHead>
                <TableHead className="w-[50px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => {
                const cfg = statusConfig[loan.status as keyof typeof statusConfig];
                return (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <div className="font-medium">{loan.asset?.name ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{loan.asset?.tagNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{loan.borrowerName}</div>
                      {loan.borrowerPosition && (
                        <div className="text-xs text-muted-foreground">{loan.borrowerPosition}</div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">{loan.purpose ?? "-"}</TableCell>
                    <TableCell>{formatDate(loan.loanDate)}</TableCell>
                    <TableCell>{formatDate(loan.expectedReturnDate)}</TableCell>
                    <TableCell>{formatDate(loan.actualReturnDate)}</TableCell>
                    <TableCell>
                      <Badge className={cfg?.className}>{cfg?.label ?? loan.status}</Badge>
                    </TableCell>
                    <TableCell>{loan.createdBy?.fullName ?? "-"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {loan.status !== "RETURNED" && (
                            <DropdownMenuItem onClick={() => onReturn(loan)}>
                              <RotateCcw className="mr-2 size-4" />
                              Kembalikan Aset
                            </DropdownMenuItem>
                          )}
                          {loan.status === "RETURNED" && (
                            <DropdownMenuItem
                              onClick={() => onDelete(loan)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Hapus
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total} peminjaman
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              Sebelumnya
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
