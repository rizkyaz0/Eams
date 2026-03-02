"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EditAssetDialog } from "./edit-asset-dialog";
import { DeleteAssetDialog } from "./delete-asset-dialog";
import { useRouter } from "next/navigation";

interface AssetsTableProps {
  assets: any[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  categories: any[];
  locations: any[];
}

const statusConfig = {
  AVAILABLE: { label: "Available", variant: "default" as const, color: "bg-green-500" },
  IN_USE: { label: "In Use", variant: "secondary" as const, color: "bg-blue-500" },
  IN_MAINTENANCE: { label: "Maintenance", variant: "outline" as const, color: "bg-orange-500" },
  MISSING: { label: "Missing", variant: "destructive" as const, color: "bg-red-500" },
  DISPOSED: { label: "Disposed", variant: "outline" as const, color: "bg-gray-500" },
};

const conditionConfig = {
  GOOD: "Good",
  MINOR_DAMAGE: "Minor Damage",
  MAJOR_DAMAGE: "Major Damage",
  TOTAL_LOSS: "Total Loss",
};

export function AssetsTable({ assets, loading, page, total, onPageChange, onRefresh, categories, locations }: AssetsTableProps) {
  const router = useRouter();
  const [editAsset, setEditAsset] = useState<any>(null);
  const [deleteAsset, setDeleteAsset] = useState<any>(null);

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

  if (assets.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <p className="text-lg font-semibold">No assets found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or create a new asset</p>
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
                <TableHead>Tag Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => {
                const status = statusConfig[asset.status as keyof typeof statusConfig];
                return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono font-semibold">{asset.tagNumber}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.category?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${status?.color}`} />
                        <Badge variant={status?.variant || "outline"}>{status?.label || asset.status}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>{conditionConfig[asset.condition as keyof typeof conditionConfig] || asset.condition}</TableCell>
                    <TableCell>{asset.location?.name || "-"}</TableCell>
                    <TableCell>{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("id-ID") : "-"}</TableCell>
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
                          <DropdownMenuItem onClick={() => router.push(`/assets/${asset.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditAsset(asset)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAsset(asset)}>
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} assets
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
      {editAsset && (
        <EditAssetDialog
          open={!!editAsset}
          onOpenChange={(open) => !open && setEditAsset(null)}
          onSuccess={() => {
            setEditAsset(null);
            onRefresh();
          }}
          asset={editAsset}
          categories={categories}
          locations={locations}
        />
      )}

      {/* Delete Dialog */}
      {deleteAsset && (
        <DeleteAssetDialog
          open={!!deleteAsset}
          onOpenChange={(open) => !open && setDeleteAsset(null)}
          onSuccess={() => {
            setDeleteAsset(null);
            onRefresh();
          }}
          asset={deleteAsset}
        />
      )}
    </>
  );
}
