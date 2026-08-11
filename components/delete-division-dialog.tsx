"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DeleteDivisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  division: any;
}

export function DeleteDivisionDialog({ open, onOpenChange, onSuccess, division }: DeleteDivisionDialogProps) {
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    setLoading(true);
    try {
      const response = await fetch(`/api/divisions/${division.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Divisi berhasil dihapus");
        onSuccess();
      } else {
        toast.error(data.error || "Gagal menghapus divisi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus Divisi</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus <span className="font-semibold">{division?.name}</span>? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-destructive/10 p-4 rounded-md text-destructive text-sm font-medium">Peringatan: Anda tidak dapat menghapus divisi yang masih memiliki pengguna atau aset.</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
