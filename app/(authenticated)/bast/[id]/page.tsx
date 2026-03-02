"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BastPrintView } from "@/components/bast-print-view";
import { approveBast, rejectBast } from "@/lib/actions/bast-actions";

export default function BastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bast, setBast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    fetchBast();
  }, [params.id]);

  const fetchBast = async () => {
    try {
      const response = await fetch(`/api/bast/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setBast(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch BAST:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const result = await approveBast(params.id as string);

      if (result.success) {
        toast.success("BAST approved successfully");
        fetchBast();
        setActionDialog(null);
      } else {
        toast.error(result.error || "Failed to approve BAST");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const result = await rejectBast(params.id as string);

      if (result.success) {
        toast.success("BAST rejected");
        fetchBast();
        setActionDialog(null);
      } else {
        toast.error(result.error || "Failed to reject BAST");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const statusConfig: any = {
    DRAFT: { label: "Draft", variant: "outline" },
    PENDING: { label: "Pending", variant: "secondary" },
    APPROVED: { label: "Approved", variant: "default" },
    REJECTED: { label: "Rejected", variant: "destructive" },
  };

  const typeConfig: any = {
    PROCUREMENT: "Procurement (Pengadaan)",
    ASSIGNMENT: "Assignment (Penyerahan)",
    RETURN: "Return (Pengembalian)",
    MUTATION: "Mutation (Mutasi)",
    MAINTENANCE_OUT: "Maintenance Out (Keluar Perbaikan)",
    MAINTENANCE_IN: "Maintenance In (Masuk Perbaikan)",
    DISPOSAL: "Disposal (Penghapusan)",
    STOCK_OPNAME: "Stock Opname",
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!bast) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <p className="text-lg font-semibold">BAST not found</p>
        <Button onClick={() => router.push("/bast")} className="mt-4">
          Back to BAST List
        </Button>
      </div>
    );
  }

  const status = statusConfig[bast.status];
  const type = typeConfig[bast.type];

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="print:hidden h-full flex flex-col">
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.push("/bast")}>
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{bast.bastNumber}</h1>
                <p className="text-muted-foreground">{type}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {bast.status === "PENDING" && (
                <>
                  <Button variant="outline" onClick={() => setActionDialog("reject")} disabled={actionLoading}>
                    <XCircle className="mr-2 size-4" />
                    Reject
                  </Button>
                  <Button onClick={() => setActionDialog("approve")} disabled={actionLoading}>
                    <CheckCircle className="mr-2 size-4" />
                    Approve
                  </Button>
                </>
              )}
              {bast.status === "APPROVED" && (
                <Button variant="outline" onClick={handlePrint} className="print:hidden">
                  <Printer className="mr-2 size-4" />
                  Download / Print BAST
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Main Info */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>BAST Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={status?.variant} className="mt-1">
                      {status?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p className="mt-1">{type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Recipient Name</p>
                    <p className="mt-1">{bast.recipientName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Recipient Position</p>
                    <p className="mt-1">{bast.recipientPosition || "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created By</p>
                    <p className="mt-1">{bast.creator?.fullName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created At</p>
                    <p className="mt-1">
                      {new Date(bast.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {bast.type === "ASSIGNMENT" && (bast.loanStartDate || bast.loanEndDate) && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tanggal Peminjaman</p>
                      <p className="mt-1 font-semibold">{bast.loanStartDate ? new Date(bast.loanStartDate).toLocaleDateString("id-ID") : "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Batas Pengembalian</p>
                      <p className="mt-1 font-semibold text-red-600">{bast.loanEndDate ? new Date(bast.loanEndDate).toLocaleDateString("id-ID") : "Tidak ditentukan (Open End)"}</p>
                    </div>
                  </div>
                )}

                {bast.description && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground">{bast.type === "ASSIGNMENT" ? "Tujuan Peminjaman" : "Notes"}</p>
                    <p className="mt-1 text-sm">{bast.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Approval Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {bast.approverName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Approved By</p>
                    <p className="mt-1">{bast.approverName}</p>
                  </div>
                )}
                {bast.approvedAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Approved At</p>
                    <p className="mt-1">
                      {new Date(bast.approvedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
                {bast.status === "PENDING" && (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">This BAST is awaiting approval</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Assets Table */}
          <Card>
            <CardHeader>
              <CardTitle>Assets ({bast.details?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag Number</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Condition</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bast.details?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.asset.tagNumber}</TableCell>
                      <TableCell className="font-medium">{item.asset.name}</TableCell>
                      <TableCell>{item.asset.category?.name || "-"}</TableCell>
                      <TableCell>{item.asset.condition}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Approve Dialog */}
          <AlertDialog open={actionDialog === "approve"} onOpenChange={() => setActionDialog(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve BAST</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to approve this BAST? This action will update the status of all associated assets.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleApprove} disabled={actionLoading}>
                  Approve
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Reject Dialog */}
          <AlertDialog open={actionDialog === "reject"} onOpenChange={() => setActionDialog(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject BAST</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to reject this BAST? This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReject} disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reject
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <BastPrintView bast={bast} />
    </>
  );
}
