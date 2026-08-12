"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface StockOpnameItemData {
  id: string;
  stockOpnameId: string;
  assetId: string;
  expectedLocation: string | null;
  expectedCondition: string | null;
  actualCondition: string | null;
  actualLocation: string | null;
  isFound: boolean | null;
  notes: string | null;
  checkedAt: string | Date | null;
  checkedById: string | null;
  asset: {
    id: string;
    name: string;
    tagNumber: string;
    condition: string;
    location: { name: string } | null;
  };
}

interface StockOpnameSessionData {
  id: string;
  title: string;
  frequency: string;
  startDate: string | Date;
  endDate: string | Date | null;
  status: string;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  items: StockOpnameItemData[];
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};
const statusLabels: Record<string, string> = {
  SCHEDULED: "Terjadwal",
  IN_PROGRESS: "Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};
const conditionLabels: Record<string, string> = {
  GOOD: "Baik",
  FAIR: "Cukup",
  POOR: "Buruk",
  DAMAGED: "Rusak",
};
const freqLabels: Record<string, string> = { MONTHLY: "Bulanan", BIWEEKLY: "2 Mingguan" };

function CheckItemDialog({
  item,
  sessionId,
  onChecked,
}: {
  item: StockOpnameItemData;
  sessionId: string;
  onChecked: (updated: StockOpnameItemData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isFound, setIsFound] = useState<string>(item.isFound !== null ? String(item.isFound) : "");
  const [actualCondition, setActualCondition] = useState(item.actualCondition || "");
  const [actualLocation, setActualLocation] = useState(item.actualLocation || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/stock-opname/${sessionId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          isFound: isFound !== "" ? isFound === "true" : null,
          actualCondition: actualCondition || null,
          actualLocation: actualLocation || null,
          notes: notes || null,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Item dicatat");
        onChecked({ ...item, ...d.data });
        setOpen(false);
      } else {
        toast.error(d.error || "Gagal mencatat item");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Catat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Pemeriksaan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm">
            <span className="font-medium">{item.asset.name}</span>
            <span className="ml-2 font-mono text-xs text-muted-foreground">{item.asset.tagNumber}</span>
          </div>
          <div className="space-y-2">
            <Label>Ditemukan?</Label>
            <Select value={isFound} onValueChange={setIsFound}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Ya</SelectItem>
                <SelectItem value="false">Tidak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Kondisi Aktual</Label>
            <Select value={actualCondition} onValueChange={setActualCondition}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kondisi..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GOOD">Baik</SelectItem>
                <SelectItem value="FAIR">Cukup</SelectItem>
                <SelectItem value="POOR">Buruk</SelectItem>
                <SelectItem value="DAMAGED">Rusak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Lokasi Aktual</Label>
            <Input
              value={actualLocation}
              onChange={(e) => setActualLocation(e.target.value)}
              placeholder="Lokasi fisik saat ditemukan..."
            />
          </div>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan..."
              rows={2}
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StockOpnameDetail({ session }: { session: StockOpnameSessionData }) {
  const router = useRouter();
  const [items, setItems] = useState(session.items);
  const [completing, setCompleting] = useState(false);

  const checkedCount = items.filter((i) => i.checkedAt !== null).length;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;
  const canEdit = session.status === "IN_PROGRESS";

  const handleChecked = (updated: StockOpnameItemData) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const r = await fetch(`/api/stock-opname/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Stock opname diselesaikan");
        router.refresh();
      } else {
        toast.error(d.error || "Gagal menyelesaikan");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{session.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {freqLabels[session.frequency] || session.frequency} · Dibuat oleh {session.createdBy.fullName}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Badge variant={statusVariants[session.status] || "outline"}>
              {statusLabels[session.status] || session.status}
            </Badge>
            {canEdit && (
              <Button size="sm" onClick={handleComplete} disabled={completing}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {completing ? "Memproses..." : "Selesaikan"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Tanggal Mulai</p>
            <p className="font-medium">{new Date(session.startDate).toLocaleDateString("id-ID")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tanggal Selesai</p>
            <p className="font-medium">
              {session.endDate ? new Date(session.endDate).toLocaleDateString("id-ID") : "-"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Aset</p>
            <p className="font-medium">{items.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Sudah Diperiksa</p>
            <p className="font-medium">
              {checkedCount} / {items.length}
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress pemeriksaan</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {session.notes && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Catatan:</span> {session.notes}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Daftar Aset</h2>
          <span className="text-sm text-muted-foreground">({items.length} item)</span>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aset</TableHead>
                <TableHead>Lokasi Terdaftar</TableHead>
                <TableHead>Kondisi Terdaftar</TableHead>
                <TableHead>Ditemukan</TableHead>
                <TableHead>Kondisi Aktual</TableHead>
                <TableHead>Lokasi Aktual</TableHead>
                <TableHead>Status Cek</TableHead>
                {canEdit && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="h-24 text-center text-muted-foreground">
                    Tidak ada aset dalam sesi ini.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className={item.checkedAt ? "bg-muted/20" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.asset.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{item.asset.tagNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.expectedLocation || item.asset.location?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {conditionLabels[item.expectedCondition || item.asset.condition] ||
                          item.asset.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.isFound === null ? (
                        <span className="text-sm text-muted-foreground">-</span>
                      ) : item.isFound ? (
                        <Badge variant="default">Ya</Badge>
                      ) : (
                        <Badge variant="destructive">Tidak</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.actualCondition ? (
                        <Badge variant="outline">
                          {conditionLabels[item.actualCondition] || item.actualCondition}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.actualLocation || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {item.checkedAt ? (
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.checkedAt).toLocaleDateString("id-ID")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Belum</span>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <CheckItemDialog item={item} sessionId={session.id} onChecked={handleChecked} />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
