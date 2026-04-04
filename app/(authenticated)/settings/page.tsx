"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Database, Trash2, RefreshCw, ShieldAlert, Info, CheckCircle, Download, FileSpreadsheet, FileDown, FileText } from "lucide-react";
import { toast } from "sonner";
import { APP_CONFIG } from "@/lib/config";

// Halaman settings hanya bisa diakses user yang sudah login.
// Proteksi SUPER_ADMIN untuk aksi berbahaya dilakukan di API-nya.
export default function SettingsPage() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetData = async () => {
    setResetting(true);
    setResetSuccess(false);
    try {
      const res = await fetch("/api/settings/reset-data", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setResetSuccess(true);
        toast.success("Data berhasil direset!", {
          description: "Semua data transaksi telah dihapus. Aset dikembalikan ke status AVAILABLE.",
          duration: 6000,
        });
        // Refresh after short delay
        setTimeout(() => router.refresh(), 2000);
      } else {
        toast.error(data.error || "Gagal mereset data");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Kelola konfigurasi dan data aplikasi EAMS</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informasi Aplikasi */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Informasi Aplikasi</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nama Aplikasi</span>
              <span className="text-sm font-medium">{APP_CONFIG.app.fullName}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Versi</span>
              <Badge variant="outline">v{APP_CONFIG.app.version}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Framework</span>
              <span className="text-sm font-medium">Next.js 16</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Database</span>
              <span className="text-sm font-medium">PostgreSQL (Supabase)</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Autentikasi</span>
              <span className="text-sm font-medium">JWT + HttpOnly Cookie</span>
            </div>
          </CardContent>
        </Card>

        {/* Informasi Instansi — Ditarik dari lib/config.ts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-500" />
              <div>
                <CardTitle className="text-base">Konfigurasi Instansi</CardTitle>
                <CardDescription className="text-xs">Edit di: <code>lib/config.ts</code></CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nama Instansi</span>
              <span className="text-sm font-medium text-right max-w-[200px] truncate">{APP_CONFIG.instansi.nama}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Unit / Bagian</span>
              <span className="text-sm font-medium">{APP_CONFIG.instansi.unit}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Kota</span>
              <span className="text-sm font-medium">{APP_CONFIG.instansi.kota}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Alamat</span>
              <span className="text-sm font-medium text-right max-w-[200px] truncate">{APP_CONFIG.instansi.alamat}</span>
            </div>
          </CardContent>
        </Card>

        {/* Format BAST */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-500" />
              <CardTitle className="text-base">Konfigurasi BAST</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Format Nomor</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">BAST/YYYY/MM/NNNN</code>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Contoh</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">BAST/2026/03/0001</code>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status Default</span>
              <Badge className="bg-yellow-500 text-white text-xs">PENDING</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Reset Counter</span>
              <span className="text-sm font-medium">Setiap bulan</span>
            </div>
          </CardContent>
        </Card>

        {/* Keamanan */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">Keamanan</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Durasi Session</span>
              <span className="text-sm font-medium">7 hari</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Max Login Gagal</span>
              <span className="text-sm font-medium">10x per 15 menit</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cookie</span>
              <Badge variant="outline" className="text-xs">HttpOnly + Secure</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Hash Algoritma</span>
              <span className="text-sm font-medium">bcrypt (12 rounds)</span>
            </div>
          </CardContent>
        </Card>

        {/* Backup Data */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-base">Backup & Export Data</CardTitle>
                <CardDescription>Unduh salinan data untuk keperluan backup atau audit.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <p className="font-semibold text-sm">Excel Multi-Sheet</p>
                  <p className="text-xs text-muted-foreground mt-1">Semua data dalam satu file Excel dengan tab per tabel (User, Aset, Kategori, Lokasi, BAST).</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => window.open("/api/settings/backup?format=excel", "_blank")}>
                  <FileSpreadsheet className="size-4 mr-2 text-emerald-600" />
                  Download Excel
                </Button>
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <p className="font-semibold text-sm">CSV (ZIP)</p>
                  <p className="text-xs text-muted-foreground mt-1">Data dalam format CSV terpisah per tabel, dikompres dalam satu file ZIP.</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => window.open("/api/settings/backup?format=csv", "_blank")}>
                  <FileDown className="size-4 mr-2 text-blue-600" />
                  Download CSV (ZIP)
                </Button>
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <p className="font-semibold text-sm">SQL Dump</p>
                  <p className="text-xs text-muted-foreground mt-1">File SQL berisi INSERT statements yang bisa digunakan untuk restore ke PostgreSQL lain.</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => window.open("/api/settings/backup?format=sql", "_blank")}>
                  <FileText className="size-4 mr-2 text-orange-600" />
                  Download SQL
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Data — Danger Zone */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <CardTitle className="text-base text-red-600">Zona Berbahaya</CardTitle>
            </div>
            <CardDescription>
              Aksi di bawah ini bersifat permanen dan tidak dapat dibatalkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 px-3 py-2 rounded-md">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Data berhasil direset. Halaman akan diperbarui...
              </div>
            )}

            <div className="rounded-lg border border-red-200 dark:border-red-900 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">Reset Semua Data Transaksi</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Menghapus: semua BAST, Maintenance, Stock Opname, Audit Log, dan Alert.
                  Status semua aset akan dikembalikan ke <strong>AVAILABLE</strong>.
                  Data master (User, Divisi, Lokasi, Kategori, Aset) <strong>tidak</strong> akan dihapus.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={resetting}
                    className="w-full"
                  >
                    {resetting ? (
                      <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Mereset Data...</>
                    ) : (
                      <><Trash2 className="mr-2 h-4 w-4" /> Reset Data Transaksi</>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Reset Data</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">Data berikut akan <strong>dihapus permanen</strong>:</span>
                      <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                        <li>Semua BAST dan detail-nya</li>
                        <li>Semua catatan maintenance</li>
                        <li>Semua data stock opname</li>
                        <li>Semua audit log dan alert</li>
                        <li>Semua aset akan dikembalikan ke status AVAILABLE</li>
                      </ul>
                      <span className="block mt-2 font-semibold text-red-600">
                        Aksi ini tidak dapat dibatalkan. Lanjutkan?
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetData}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Ya, Reset Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
