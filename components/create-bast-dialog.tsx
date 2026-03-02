"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { createBast } from "@/lib/actions/bast-actions";
import { BastType, AssetCondition } from "@prisma/client";

interface CreateBastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateBastDialog({ open, onOpenChange, onSuccess }: CreateBastDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    type: "",
    recipientName: "",
    recipientPosition: "",
    notes: "",
    loanStartDate: "",
    loanEndDate: "",
  });

  const filteredAssets = assets.filter((asset) => asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || asset.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    if (open) {
      fetchAvailableAssets();
    }
  }, [open]);

  const fetchAvailableAssets = async () => {
    try {
      const response = await fetch("/api/assets?status=AVAILABLE&limit=100");
      const data = await response.json();
      if (data.success) {
        setAssets(data.data.assets);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    }
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssets((prev) => (prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]));
  };

  const handleSubmit = async () => {
    if (selectedAssets.length === 0) {
      toast.error("Please select at least one asset");
      return;
    }

    setLoading(true);
    try {
      const result = await createBast({
        type: formData.type as BastType,
        recipientName: formData.recipientName,
        recipientPosition: formData.recipientPosition,
        description: formData.notes,
        loanStartDate: formData.type === BastType.ASSIGNMENT && formData.loanStartDate ? new Date(formData.loanStartDate) : undefined,
        loanEndDate: formData.type === BastType.ASSIGNMENT && formData.loanEndDate ? new Date(formData.loanEndDate) : undefined,
        items: selectedAssets.map((assetId) => ({
          assetId,
          conditionAfter: AssetCondition.GOOD, // Default to GOOD for handover
        })),
      });

      if (result.success) {
        toast.success("BAST created successfully");
        setFormData({
          type: "",
          recipientName: "",
          recipientPosition: "",
          notes: "",
          loanStartDate: "",
          loanEndDate: "",
        });
        setSelectedAssets([]);
        setStep(1);
        onSuccess();
      } else {
        toast.error(result.error || "Failed to create BAST");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = formData.type && formData.recipientName;
  const canSubmit = selectedAssets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New BAST</DialogTitle>
          <DialogDescription>
            Step {step} of 2: {step === 1 ? "Basic Information" : "Select Assets"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">BAST Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BastType.ASSIGNMENT}>Assignment (Penyerahan)</SelectItem>
                  <SelectItem value={BastType.RETURN}>Return (Pengembalian)</SelectItem>
                  <SelectItem value={BastType.MUTATION}>Mutation (Mutasi/Pemindahan)</SelectItem>
                  <SelectItem value={BastType.DISPOSAL}>Disposal (Penghapusan)</SelectItem>
                  <SelectItem value={BastType.MAINTENANCE_OUT}>Maintenance Out (Keluar Perbaikan)</SelectItem>
                  <SelectItem value={BastType.MAINTENANCE_IN}>Maintenance In (Kembali Perbaikan)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="recipientName">Recipient Name *</Label>
                <Input id="recipientName" value={formData.recipientName} onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })} placeholder="Enter name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recipientPosition">Recipient Position</Label>
                <Input id="recipientPosition" value={formData.recipientPosition} onChange={(e) => setFormData({ ...formData, recipientPosition: e.target.value })} placeholder="Enter position" />
              </div>
            </div>

            {formData.type === BastType.ASSIGNMENT && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="loanStartDate">Tanggal Peminjaman</Label>
                  <Input id="loanStartDate" type="date" value={formData.loanStartDate} onChange={(e) => setFormData({ ...formData, loanStartDate: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="loanEndDate">Tanggal Pengembalian (Opsional)</Label>
                  <Input id="loanEndDate" type="date" value={formData.loanEndDate} onChange={(e) => setFormData({ ...formData, loanEndDate: e.target.value })} />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">{formData.type === BastType.ASSIGNMENT ? "Tujuan Peminjaman / Keterangan" : "Notes"}</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder={formData.type === BastType.ASSIGNMENT ? "Tujuan Peminjaman..." : "Additional notes..."} />
            </div>
          </div>
        )}

        {/* Step 2: Select Assets */}
        {step === 2 && (
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{selectedAssets.length} asset(s) selected</p>
                <Badge variant="secondary">{assets.length} available</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search assets by name or tag..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>

            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
              {filteredAssets.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No assets found matching your search.</div>
              ) : (
                filteredAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer" onClick={() => toggleAsset(asset.id)}>
                    <Checkbox checked={selectedAssets.includes(asset.id)} onCheckedChange={() => toggleAsset(asset.id)} />
                    <div className="flex-1">
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {asset.tagNumber} • {asset.category?.name}
                      </p>
                    </div>
                    <Badge variant="outline">{asset.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step === 2 && (
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 size-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            {step === 1 ? (
              <Button onClick={() => setStep(2)} disabled={!canProceedToStep2}>
                Next
                <ChevronRight className="ml-2 size-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create BAST
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
