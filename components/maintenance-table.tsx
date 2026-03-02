"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { EditMaintenanceDialog } from "@/components/edit-maintenance-dialog";

interface MaintenanceTableProps {
  maintenances: any[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onDelete: (maintenance: any) => void;
}

const statusConfig = {
  PENDING: { label: "Pending", variant: "secondary" as const, color: "bg-gray-500 text-white" },
  IN_PROGRESS: { label: "In Progress", variant: "default" as const, color: "bg-blue-500 text-white" },
  COMPLETED: { label: "Completed", variant: "default" as const, color: "bg-green-500 text-white" }, // Changed to default
  CANCELLED: { label: "Cancelled", variant: "destructive" as const, color: "bg-red-500 text-white" },
};

export function MaintenanceTable({ maintenances, loading, page, total, onPageChange, onRefresh, onDelete }: MaintenanceTableProps) {
  const [editMaintenance, setEditMaintenance] = useState<any>(null);

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

  if (maintenances.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <p className="text-lg font-semibold">No maintenance records found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or create a new record</p>
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
                <TableHead>Asset Tag</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenances.map((maintenance) => {
                const status = statusConfig[maintenance.status as keyof typeof statusConfig] || { label: maintenance.status, variant: "outline", color: "" };
                return (
                  <TableRow key={maintenance.id}>
                    <TableCell className="font-mono font-semibold">{maintenance.asset?.tagNumber}</TableCell>
                    <TableCell>{maintenance.asset?.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={maintenance.description}>
                      {maintenance.description}
                    </TableCell>
                    <TableCell>{maintenance.vendorName || "-"}</TableCell>
                    <TableCell>{maintenance.cost ? formatCurrency(parseFloat(maintenance.cost)) : "-"}</TableCell>
                    <TableCell>{new Date(maintenance.startDate).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell>{maintenance.endDate ? new Date(maintenance.endDate).toLocaleDateString("id-ID") : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className={status.color}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditMaintenance(maintenance)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(maintenance)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
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

      {/* Edit Dialog */}
      {editMaintenance && (
        <EditMaintenanceDialog
          open={!!editMaintenance}
          onOpenChange={(open: boolean) => !open && setEditMaintenance(null)}
          onSuccess={() => {
            setEditMaintenance(null);
            onRefresh();
          }}
          maintenance={editMaintenance}
        />
      )}
    </>
  );
}
