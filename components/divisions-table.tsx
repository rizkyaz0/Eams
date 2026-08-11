"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2, Search } from "lucide-react";
import { CreateDivisionDialog } from "@/components/create-division-dialog";
import { EditDivisionDialog } from "@/components/edit-division-dialog";
import { DeleteDivisionDialog } from "@/components/delete-division-dialog";
import { useRouter } from "next/navigation";

interface Division {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  _count?: {
    users: number;
    assets: number;
  };
}

interface DivisionsTableProps {
  data: Division[];
}

export function DivisionsTable({ data }: DivisionsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);

  const filteredData = data.filter(
    (item) =>
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEdit = (division: Division) => {
    setSelectedDivision(division);
    setEditOpen(true);
  };

  const handleDelete = (division: Division) => {
    setSelectedDivision(division);
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
            <Input placeholder="Search divisions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-full max-w-xs" />
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Division
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Total Users</TableHead>
              <TableHead className="text-center">Total Assets</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((division) => (
                <TableRow key={division.id}>
                  <TableCell className="font-medium">{division.code}</TableCell>
                  <TableCell>{division.name}</TableCell>
                  <TableCell>{division.description || "-"}</TableCell>
                  <TableCell className="text-center">{division._count?.users || 0}</TableCell>
                  <TableCell className="text-center">{division._count?.assets || 0}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEdit(division)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(division)} className="text-red-600 focus:text-red-600">
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

      <CreateDivisionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          refreshData();
        }}
      />

      <EditDivisionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        division={selectedDivision}
        onSuccess={() => {
          setEditOpen(false);
          refreshData();
        }}
      />

      <DeleteDivisionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        division={selectedDivision}
        onSuccess={() => {
          setDeleteOpen(false);
          refreshData();
        }}
      />
    </div>
  );
}
