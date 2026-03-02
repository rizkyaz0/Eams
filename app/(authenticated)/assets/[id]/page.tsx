"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, QrCode, Printer, Image as ImageIcon, Camera, Loader2 } from "lucide-react";
import { EditAssetDialog } from "@/components/edit-asset-dialog";
import { DeleteAssetDialog } from "@/components/delete-asset-dialog";
import { toast } from "sonner";
import { AssetLabel } from "@/components/asset-label";
import { Label } from "@/components/ui/label";

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAsset();
    fetchCategories();
    fetchLocations();
  }, [params.id]);

  const fetchAsset = async () => {
    try {
      const response = await fetch(`/api/assets/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setAsset(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch asset:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      if (data.success) setCategories(data.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      const data = await response.json();
      if (data.success) setLocations(data.data);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/assets/${asset.id}/images`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Image uploaded successfully");
        fetchAsset();
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (error) {
      toast.error("An error occurred during upload");
    } finally {
      setUploading(false);
    }
  };

  const statusConfig: any = {
    AVAILABLE: { label: "Available", variant: "default", color: "bg-green-500" },
    IN_USE: { label: "In Use", variant: "secondary", color: "bg-blue-500" },
    IN_MAINTENANCE: { label: "Maintenance", variant: "outline", color: "bg-orange-500" },
    MISSING: { label: "Missing", variant: "destructive", color: "bg-red-500" },
    DISPOSED: { label: "Disposed", variant: "outline", color: "bg-gray-500" },
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <p className="text-lg font-semibold">Asset not found</p>
        <Button onClick={() => router.push("/assets")} className="mt-4">
          Back to Assets
        </Button>
      </div>
    );
  }

  const status = statusConfig[asset.status];

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push("/assets")}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{asset.name}</h1>
              <p className="text-muted-foreground">Tag: {asset.tagNumber}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="mr-2 size-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Main Info Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Asset Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-col md:flex-row gap-6 mb-6">
                {/* Asset Image Section */}
                <div className="relative group w-full md:w-48 aspect-square shrink-0 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 overflow-hidden flex items-center justify-center">
                  {asset.imagePath ? (
                    <img src={asset.imagePath} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="size-10 opacity-20" />
                      <span className="text-[10px] font-medium uppercase tracking-wider opacity-40">No Image</span>
                    </div>
                  )}

                  <label className="absolute inset-0 z-10 cursor-pointer bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <Loader2 className="size-6 text-white animate-spin" />
                    ) : (
                      <>
                        <Camera className="size-6 text-white mb-1" />
                        <span className="text-[10px] text-white font-bold uppercase">Update Photo</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`size-2 rounded-full ${status?.color}`} />
                        <Badge variant={status?.variant}>{status?.label}</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Condition</p>
                      <Badge variant="outline" className="mt-1">
                        {asset.condition}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <p className="mt-1 font-semibold">{asset.category?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="mt-1 font-semibold">{asset.location?.name || "-"}</p>
                    </div>
                  </div>

                  {asset.holder && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-sm font-medium text-muted-foreground">Penanggung Jawab / Peminjam</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="font-semibold bg-blue-100 text-blue-800 hover:bg-blue-100">
                          {asset.holder.fullName}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                  <p className="mt-1">
                    {asset.purchaseDate
                      ? new Date(asset.purchaseDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Purchase Price</p>
                  <p className="mt-1">{asset.purchasePrice ? `Rp ${asset.purchasePrice.toLocaleString("id-ID")}` : "-"}</p>
                </div>
              </div>

              {asset.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="mt-1 text-sm">{asset.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <CardTitle>QR Code</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="bg-white rounded-lg p-4 flex items-center justify-center border">
                {/* Use window.location.href if available, else placeholder. 
                      Since this is client component, window is available in useEffect, 
                      but simpler to just use ID for now or construct URL. 
                  */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/assets/${asset.id}`)}`}
                  alt="Asset QR Code"
                  className="size-32"
                  id="asset-qr-code"
                />
              </div>
              <div className="flex flex-col gap-2 mt-4 w-full">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const img = document.getElementById("asset-qr-code") as HTMLImageElement;
                    if (img) {
                      fetch(img.src)
                        .then((res) => res.blob())
                        .then((blob) => {
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `QR-${asset.tagNumber}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        })
                        .catch(() => toast.error("Failed to download QR"));
                    }
                  }}
                >
                  Download QR
                </Button>
                <Button className="w-full" onClick={() => window.print()}>
                  <Printer className="mr-2 size-4" />
                  Print Asset Label
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created At</p>
              <p className="mt-1 text-sm">
                {new Date(asset.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="mt-1 text-sm">
                {new Date(asset.updatedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Asset ID</p>
              <p className="mt-1 text-sm font-mono">{asset.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {editOpen && (
        <EditAssetDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={() => {
            setEditOpen(false);
            fetchAsset();
          }}
          asset={asset}
          categories={categories}
          locations={locations}
        />
      )}

      {deleteOpen && <DeleteAssetDialog open={deleteOpen} onOpenChange={setDeleteOpen} onSuccess={() => router.push("/assets")} asset={asset} />}
      <AssetLabel asset={asset} />
    </>
  );
}
