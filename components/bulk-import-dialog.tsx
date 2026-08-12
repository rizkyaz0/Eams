"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, FileUp, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

interface ParsedRow {
  name: string;
  tagNumber: string;
  serialNumber?: string;
  specification?: string;
  category?: string;
  location?: string;
  division?: string;
  purchaseDate: string;
  purchasePrice: string;
  vendorName?: string;
  warrantyExpiry?: string;
  condition?: string;
  description?: string;
}

interface BulkImportDialogProps {
  onSuccess?: () => void;
}

export function BulkImportDialog({ onSuccess }: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<{ row: number; message: string }[] | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsedRows([]);
    setFileName("");
    setErrors(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportResult(null);
    setErrors(null);
    setFileName(file.name);

    if (!file.name.endsWith(".csv")) {
      toast.error("File harus berformat CSV");
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV kosong atau hanya header");
        return;
      }

      // Parse CSV (simple parser — handles quoted fields)
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            result.push(current);
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current);
        return result;
      };

      const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
      const rows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx]?.trim() || "";
        });
        rows.push(row as ParsedRow);
      }

      setParsedRows(rows);
      toast.success(`${rows.length} baris siap diimpor`);
    } catch {
      toast.error("Gagal membaca file CSV");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/assets/bulk-import");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "asset-import-template.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Template CSV diunduh");
    } catch {
      toast.error("Gagal mengunduh template");
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      toast.error("Tidak ada data untuk diimpor");
      return;
    }

    setLoading(true);
    setErrors(null);
    setImportResult(null);

    try {
      const res = await fetch("/api/assets/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: parsedRows }),
      });
      const data = await res.json();

      if (data.success) {
        setImportResult({ imported: data.data.imported, errors: [] });
        toast.success(`Berhasil mengimpor ${data.data.imported} aset`);
        setParsedRows([]);
        if (onSuccess) onSuccess();
      } else {
        // Validation errors
        const errs = data.data || data.error || "Gagal mengimpor";
        if (Array.isArray(errs)) {
          setErrors(errs);
          toast.error(`${errs.length} baris gagal validasi`);
        } else {
          toast.error(errs);
        }
      }
    } catch {
      toast.error("Terjadi kesalahan saat mengimpor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 size-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Aset dari CSV</DialogTitle>
          <DialogDescription>
            Unggah file CSV untuk menambahkan beberapa aset sekaligus. Maksimal 500 aset per import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download template */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <FileUp className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Template CSV</p>
                <p className="text-xs text-muted-foreground">Unduh template untuk format yang benar</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="mr-2 size-4" />
              Unduh
            </Button>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">File CSV</Label>
            <Input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
            />
            {fileName && (
              <p className="text-xs text-muted-foreground">
                File: <span className="font-medium">{fileName}</span> — {parsedRows.length} baris terbaca
              </p>
            )}
          </div>

          {/* Import result */}
          {importResult && (
            <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-4 flex items-center gap-3">
              <CheckCircle className="size-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Berhasil mengimpor {importResult.imported} aset
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  Aset baru siap digunakan
                </p>
              </div>
            </div>
          )}

          {/* Validation errors */}
          {errors && errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="size-4" />
                <p className="text-sm font-medium">{errors.length} baris gagal validasi:</p>
              </div>
              <div className="rounded-md border max-h-[200px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Baris</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((err, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{err.row}</TableCell>
                        <TableCell className="text-red-600">{err.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Preview table */}
          {parsedRows.length > 0 && !importResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Preview ({parsedRows.length} baris)</p>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="mr-1 size-3" /> Batal
                </Button>
              </div>
              <div className="rounded-md border max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tag Number</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Tanggal Beli</TableHead>
                      <TableHead>Harga</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.name || <span className="text-red-500">—</span>}</TableCell>
                        <TableCell>{row.tagNumber || <span className="text-red-500">—</span>}</TableCell>
                        <TableCell>{row.category || "-"}</TableCell>
                        <TableCell>{row.purchaseDate || <span className="text-red-500">—</span>}</TableCell>
                        <TableCell>{row.purchasePrice || <span className="text-red-500">—</span>}</TableCell>
                      </TableRow>
                    ))}
                    {parsedRows.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          ... dan {parsedRows.length - 50} baris lainnya
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Tutup
          </Button>
          {parsedRows.length > 0 && !importResult && (
            <Button onClick={handleImport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Mengimpor...
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-4" />
                  Import {parsedRows.length} Aset
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}