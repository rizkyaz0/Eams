/**
 * ============================================================
 * FILE KONFIGURASI APLIKASI — lib/config.ts
 * ============================================================
 * Ubah data di bawah ini sesuai instansi/sekolah Anda.
 * File ini digunakan oleh:
 *  - Kop surat PDF (export BAST & laporan inventaris)
 *  - Halaman settings (info aplikasi)
 *  - Footer dokumen resmi
 * ============================================================
 */

export const APP_CONFIG = {
  /**
   * Informasi Instansi
   * Digunakan di: kop surat PDF, tanda tangan dokumen
   */
  instansi: {
    nama: "SMK NEGERI 1 CONTOH",            // Nama lengkap instansi/sekolah
    unit: "Unit Logistik dan Aset",          // Unit/bagian pengelola aset
    alamat: "Jl. Contoh No. 1, Kota Contoh", // Alamat instansi
    kota: "Kota Contoh",                     // Kota (untuk narasi BAST)
    telepon: "(021) 000-0000",               // Telepon (opsional, untuk kop)
    email: "info@sekolah.sch.id",            // Email instansi (opsional)
    website: "",                              // Website (opsional)
  },

  /**
   * Informasi Aplikasi
   */
  app: {
    name: "EAMS",
    fullName: "Enterprise Asset Management System",
    version: "2.0",
    description: "Sistem Manajemen Aset Digital",
  },

  /**
   * Pengaturan BAST
   * Digunakan saat generate nomor BAST otomatis
   */
  bast: {
    prefix: "BAST",           // Prefix nomor BAST, contoh: "BAST/2025/01/0001"
    prefixLaporan: "LAP",     // Prefix untuk nomor laporan
  },
};

/**
 * Tipe TypeScript untuk APP_CONFIG
 * (auto-inferred, tidak perlu diubah)
 */
export type AppConfig = typeof APP_CONFIG;
