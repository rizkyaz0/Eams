"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { MaintenanceTable } from "@/components/maintenance-table";
import { CreateMaintenanceDialog } from "@/components/create-maintenance-dialog";
import { DeleteMaintenanceDialog } from "@/components/delete-maintenance-dialog";
import { toast } from "sonner";

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteMaintenance, setDeleteMaintenance] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(statusFilter && statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/maintenance?${params}`);
      const data = await response.json();

      if (data.success) {
        setMaintenances(data.data.maintenances);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch maintenance records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchMaintenances();
  }, [page, statusFilter]);

  const handleDelete = async (maintenance: any) => {
    if (!confirm(`Are you sure you want to delete maintenance record for ${maintenance.asset?.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/maintenance/${maintenance.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Maintenance record deleted successfully");
        fetchMaintenances();
      } else {
        toast.error(data.error || "Failed to delete maintenance record");
      }
    } catch (error) {
      toast.error("An error occurred while deleting");
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
            <p className="text-muted-foreground">Track and manage asset maintenance</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Record
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <MaintenanceTable maintenances={maintenances} loading={loading} page={page} total={total} onPageChange={setPage} onRefresh={fetchMaintenances} onDelete={handleDelete} />
      </div>

      <CreateMaintenanceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          fetchMaintenances();
        }}
      />

      {deleteMaintenance && (
        <DeleteMaintenanceDialog
          open={!!deleteMaintenance}
          onOpenChange={(open) => !open && setDeleteMaintenance(null)}
          onSuccess={() => {
            setDeleteMaintenance(null);
            fetchMaintenances();
          }}
          maintenance={deleteMaintenance}
        />
      )}
    </>
  );
}
