"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DeleteLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  location: any;
}

export function DeleteLocationDialog({ open, onOpenChange, onSuccess, location }: DeleteLocationDialogProps) {
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    setLoading(true);
    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Location deleted successfully");
        onSuccess();
      } else {
        toast.error(data.error || "Failed to delete location");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Location</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-semibold">{location?.name}</span>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-destructive/10 p-4 rounded-md text-destructive text-sm font-medium">Warning: You cannot delete a location if it has assets assigned to it.</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
