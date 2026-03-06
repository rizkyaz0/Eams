"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EditUserDialog } from "@/components/edit-user-dialog";

interface UsersTableProps {
  users: any[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onDelete: (user: any) => void;
  currentUserId?: string; // to disable self-edit/delete
}

const roleConfig = {
  SUPER_ADMIN: { label: "Super Admin", color: "bg-purple-500 text-white" },
  ADMIN_INSTANSI: { label: "Admin Instansi", color: "bg-blue-500 text-white" },
  STAFF_ASSET: { label: "Staff Asset", color: "bg-green-500 text-white" },
  TEKNISI: { label: "Teknisi", color: "bg-orange-500 text-white" },
  EMPLOYEE: { label: "Employee", color: "bg-gray-500 text-white" },
};

export function UsersTable({ users, loading, page, total, onPageChange, onRefresh, onDelete, currentUserId }: UsersTableProps) {
  const [editUser, setEditUser] = useState<any>(null);

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

  if (users.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <p className="text-lg font-semibold">No users found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or create a new user</p>
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
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Division</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const role = roleConfig[user.role as keyof typeof roleConfig] || { label: user.role, color: "" };
                const isSelf = currentUserId === user.id;
                return (
                  <TableRow key={user.id} className={isSelf ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.fullName}
                        {isSelf && <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">Anda</span>}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.nip || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={role.color}>
                        {role.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.division?.name || "-"}</TableCell>
                    <TableCell className="text-right">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground italic pr-2">Akun aktif</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(user)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
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
      {editUser && (
        <EditUserDialog
          open={!!editUser}
          onOpenChange={(open: boolean) => !open && setEditUser(null)}
          onSuccess={() => {
            setEditUser(null);
            onRefresh();
          }}
          user={editUser}
        />
      )}
    </>
  );
}
