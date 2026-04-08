import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface DeleteAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asset: any;
}

export function DeleteAssetDialog({ open, onOpenChange, onSuccess, asset }: DeleteAssetDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const isPermanent = asset?.status === "DISPOSED";
    
    try {
      const response = await fetch(`/api/assets/${asset.id}${isPermanent ? "?permanent=true" : ""}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(isPermanent ? "Aset berhasil dihapus secara permanen" : "Asset deleted successfully");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(data.error || "Failed to delete asset");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isPermanent = asset?.status === "DISPOSED";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isPermanent ? "Hapus Permanen Aset" : "Delete Asset"}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to {isPermanent ? "PERMANENTLY delete" : "delete"} <strong>{asset?.name}</strong> ({asset?.tagNumber})?
            <br />
            <br />
            {isPermanent ? "Data yang terhapus permanen tidak dapat dikembalikan lagi. Jika aset memiliki riwayat BAST, sistem akan menolaknya." : "This will move the asset to Trash (Disposed status)."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isPermanent ? "Hapus Permanen" : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
