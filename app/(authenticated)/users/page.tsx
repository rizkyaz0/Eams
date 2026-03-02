"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { UsersTable } from "@/components/users-table";
import { CreateUserDialog } from "@/components/create-user-dialog";
import { DeleteUserDialog } from "@/components/delete-user-dialog";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(roleFilter && roleFilter !== "all" && { role: roleFilter }),
      });

      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchUsers();
  }, [page, search, roleFilter]);

  if (!isMounted) {
    return null;
  }

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">Manage system users and roles</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add User
          </Button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, or NIP..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-9 max-w-[300px]" />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(val) => {
              setRoleFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              <SelectItem value="ADMIN_INSTANSI">Admin Instansi</SelectItem>
              <SelectItem value="STAFF_ASSET">Staff Asset</SelectItem>
              <SelectItem value="TEKNISI">Teknisi</SelectItem>
              <SelectItem value="EMPLOYEE">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <UsersTable users={users} loading={loading} page={page} total={total} onPageChange={setPage} onRefresh={fetchUsers} onDelete={setDeleteUser} />
      </div>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          fetchUsers();
        }}
      />

      {deleteUser && (
        <DeleteUserDialog
          open={!!deleteUser}
          onOpenChange={(open) => !open && setDeleteUser(null)}
          onSuccess={() => {
            setDeleteUser(null);
            fetchUsers();
          }}
          user={deleteUser}
        />
      )}
    </>
  );
}
