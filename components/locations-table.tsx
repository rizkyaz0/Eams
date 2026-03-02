"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2, Search } from "lucide-react";
import { CreateLocationDialog } from "@/components/create-location-dialog";
import { EditLocationDialog } from "@/components/edit-location-dialog";
import { DeleteLocationDialog } from "@/components/delete-location-dialog";
import { useRouter } from "next/navigation";

interface Location {
  id: string;
  name: string;
  address?: string | null;
  description?: string | null;
  _count?: {
    assets: number;
  };
}

interface LocationsTableProps {
  data: Location[];
}

export function LocationsTable({ data }: LocationsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const filteredData = data.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) || (item.address && item.address.toLowerCase().includes(search.toLowerCase())));

  const handleEdit = (location: Location) => {
    setSelectedLocation(location);
    setEditOpen(true);
  };

  const handleDelete = (location: Location) => {
    setSelectedLocation(location);
    setDeleteOpen(true);
  };

  const refreshData = () => {
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search locations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-[250px]" />
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Location
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Total Assets</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>{location.address || "-"}</TableCell>
                  <TableCell>{location.description || "-"}</TableCell>
                  <TableCell className="text-center">{location._count?.assets || 0}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(location)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(location)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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

      <CreateLocationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          refreshData();
        }}
      />

      <EditLocationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        location={selectedLocation}
        onSuccess={() => {
          setEditOpen(false);
          refreshData();
        }}
      />

      <DeleteLocationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        location={selectedLocation}
        onSuccess={() => {
          setDeleteOpen(false);
          refreshData();
        }}
      />
    </div>
  );
}
