"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  maintenance: any;
}

export function EditMaintenanceDialog({ open, onOpenChange, onSuccess, maintenance }: EditMaintenanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form state
  const [description, setDescription] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [cost, setCost] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (maintenance) {
      setDescription(maintenance.description || "");
      setVendorName(maintenance.vendorName || "");
      setCost(maintenance.cost ? maintenance.cost.toString() : "");
      setStartDate(maintenance.startDate ? new Date(maintenance.startDate).toISOString().split("T")[0] : "");
      setEndDate(maintenance.endDate ? new Date(maintenance.endDate).toISOString().split("T")[0] : "");
      setStatus(maintenance.status || "PENDING");
    }
  }, [maintenance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/maintenance/${maintenance.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          vendorName,
          cost: cost ? parseFloat(cost) : null,
          startDate,
          endDate: endDate || null,
          status,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to update maintenance record");
      }

      toast.success("Maintenance record updated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Maintenance Record</DialogTitle>
            <DialogDescription>Update the details of the maintenance.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Asset</Label>
              <Input value={`${maintenance.asset?.tagNumber} - ${maintenance.asset?.name}`} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the maintenance issue or request" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vendor">Vendor Name</Label>
                <Input id="vendor" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. Service Center" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost">Cost (IDR)</Label>
                <Input id="cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Setting to In Progress will update Asset status to Maintenance.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
