"use client";

import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BastTableProps {
  basts: any[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

const statusConfig = {
  DRAFT: { label: "Draft", variant: "outline" as const },
  PENDING: { label: "Pending", variant: "secondary" as const },
  APPROVED: { label: "Approved", variant: "default" as const },
  REJECTED: { label: "Rejected", variant: "destructive" as const },
};

const typeConfig: any = {
  PROCUREMENT: "Procurement",
  ASSIGNMENT: "Assignment",
  RETURN: "Return",
  MUTATION: "Mutation",
  MAINTENANCE_OUT: "Maint. Out",
  MAINTENANCE_IN: "Maint. In",
  DISPOSAL: "Disposal",
  STOCK_OPNAME: "Stock Opname",
};

export function BastTable({ basts, loading, page, total, onPageChange }: BastTableProps) {
  const router = useRouter();
  const limit = 10;
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

  if (basts.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <p className="text-lg font-semibold">No BAST found</p>
          <p className="text-sm text-muted-foreground mt-1">Create a new BAST to get started</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>BAST Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {basts.map((bast) => {
              const status = statusConfig[bast.status as keyof typeof statusConfig];
              const type = typeConfig[bast.type as keyof typeof typeConfig];

              return (
                <TableRow key={bast.id}>
                  <TableCell className="font-mono font-semibold">{bast.bastNumber}</TableCell>
                  <TableCell>{type}</TableCell>
                  <TableCell>
                    <Badge variant={status?.variant || "outline"}>{status?.label || bast.status}</Badge>
                  </TableCell>
                  <TableCell>{bast._count?.details || 0} items</TableCell>
                  <TableCell>{bast.creator?.fullName || "-"}</TableCell>
                  <TableCell>
                    {new Date(bast.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/bast/${bast.id}`)}>
                        <Eye className="mr-2 size-4" />
                        View
                      </Button>
                      {bast.status === "APPROVED" && (
                        <Button variant="outline" size="sm" onClick={() => window.open(`/bast/${bast.id}/print`, "_blank")}>
                          <Download className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <p className="text-sm text-muted-foreground">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} BAists
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
