# UJI KOMPETENSI KEAHLIAN TAHUN PELAJARAN 2025/2026

## SOAL UJI KOMPETENSI

**Informasi Umum**

- **Satuan Pendidikan**: Sekolah Menengah Kejuruan
- **Kompetensi Keahlian**: Pengembangan Perangkat Lunak dan Gim
- **Alokasi Waktu**: 16 jam
- **Bentuk Soal**: Penugasan Perorangan (Praktik)
- **Judul Tugas**: Membuat Inventaris Barang

---

## I. PETUNJUK UMUM

1. Periksalah dengan teliti dokumen soal ujian praktik
2. Periksalah peralatan dan bahan yang dibutuhkan
3. Gunakan peralatan utama dan peralatan keselamatan kerja yang telah disediakan
4. Gunakan peralatan sesuai dengan SOP (Standard Operating Procedure)
5. Bekerjalah dengan memperhatikan petunjuk Pembimbing/Penguji
6. Diperkenankan meninggalkan ruangan untuk beristirahat atau ke kamar kecil tanpa penghentian waktu ujian
7. Tetap tenang dan tidak gaduh saat berada di dalam tempat uji kompetensi

---

## II. DAFTAR PERALATAN

### Alat

| No. | Nama Alat/Bahan/Komponen       | Spesifikasi Minimal                                                                    | Keterangan |
| --- | ------------------------------ | -------------------------------------------------------------------------------------- | ---------- |
| 1   | Komputer berupa PC atau Laptop | Prosesor: Dual Core 2,4 GHz<br>RAM: 2 Gb<br>Storage: 256Gb<br>Keyboard, Mouse, Monitor |            |

### Software Pendukung

| No. | Nama Alat/Bahan/Komponen  | Spesifikasi Minimal                                              | Keterangan                 |
| --- | ------------------------- | ---------------------------------------------------------------- | -------------------------- |
| 1   | Sistem Operasi            | Windows 7/Linux/ Sistem operasi lain sesuai spesifikasi komputer |                            |
| 2   | Aplikasi Code Editor      | Versi menyesuaikan spesifikasi komputer                          | Bagi yang berbasis web     |
| 3   | Aplikasi Web Designer     | Versi menyesuaikan spesifikasi komputer                          | Bagi yang berbasis web     |
| 4   | Aplikasi Web Server       | Versi menyesuaikan spesifikasi komputer                          | Bagi yang berbasis web     |
| 5   | IDE Pemrograman Desktop   | Versi menyesuaikan spesifikasi komputer                          | Bagi yang berbasis desktop |
| 6   | Aplikasi Wireframe/mockup | Versi menyesuaikan spesifikasi komputer                          |                            |

### Bahan

| No. | Nama Alat/Bahan/Komponen |
| --- | ------------------------ |
| 1   | File Gambar Penunjang    |
| 2   | Data Dummy               |

---

## III. SOAL ASPEK KETERAMPILAN

**Judul Tugas:** Membuat Inventaris Barang

**Langkah Kerja:**

1. Tentukan platform aplikasi yang akan dibuat (Web).
2. Siapkan peralatan dan aplikasi pendukung yang akan digunakan.
3. Lakukan proses install aplikasi pendukung yang dibutuhkan sesuai dengan jenis aplikasi yang akan dibuat.
4. Siapkan file gambar dan file data dummy yang akan digunakan jika diperlukan.
5. Buatlah mockup aplikasi sesuai dengan rancangan yang disiapkan, komponen lain dapat ditambahkan jika diperlukan.
6. Implementasikan mockup ke dalam layout user interface, pastikan memenuhi unsur estetika dan kaidah dasar desain grafis.
7. Lakukan identifikasi alur pemrograman dan algoritma yang akan digunakan.
8. Lakukan pemrograman menggunakan bahasa pemrograman yang anda pilih dengan ketentuan sebagai berikut.

---

## IV. KETENTUAN APLIKASI

### USER YANG TERLIBAT

1. **Admin**: Petugas TU atau pengelola inventaris.
2. **User**: Melihat dan meng-approve BAST sebagai pihak penyerah/penerima barang.

### KEBUTUHAN FUNGSIONAL

- **Login**
  - Admin dan User harus login sebelum mengakses sistem.
  - Sistem melakukan autentikasi berdasarkan username dan password.
- **Manajemen Data Barang**
  - Admin dapat menambahkan, mengedit, dan menghapus data barang.
  - Admin dapat mengelola kategori barang (tambah/edit/hapus).
  - Admin dapat mengelola lokasi barang (tambah/edit/hapus).
  - Sistem otomatis menghasilkan QR Code dari logika bisnis: `{kode_kategori}/{kode_lokasi}/{kode_barang}`
  - Admin dapat menetapkan status barang:
    - Baik
    - Rusak ringan
    - Rusak berat
    - Hilang/dipindahkan
- **Fitur BAST (Berita Acara Serah Terima)**
  - Admin dapat membuat dokumen BAST dengan menentukan barang, User Serah, dan User Terima.
  - User Serah dapat melihat BAST yang menunggu approval dan melakukan approve sebagai pihak penyerah.
  - User Terima dapat melihat BAST yang menunggu approval dan melakukan approve sebagai pihak penerima.
  - Sistem mengubah status BAST menjadi Disetujui jika kedua pihak sudah approve.
  - Admin dapat melihat semua laporan BAST (menunggu, disetujui).
  - Sistem dapat mengekspor dokumen BAST ke PDF/Excel.
- **Laporan & Monitoring**
  - Admin dapat melihat laporan per barang (riwayat serah terima, kondisi/status, lokasi).
  - Admin dapat melihat laporan BAST secara keseluruhan.
  - Sistem menyediakan filter laporan berdasarkan kategori, lokasi, status barang, atau status BAST.
- **QR Code & Status Barang**
  - Setiap barang memiliki QR Code unik yang dihasilkan dari kode kategori, lokasi, dan kode barang.
  - User/Admin dapat scan QR Code untuk melihat detail barang (kategori, lokasi, status, riwayat BAST).
- **Ekspor & Backup**
  - Sistem dapat mengekspor laporan inventaris dan BAST ke PDF/Excel.
  - Sistem menyediakan opsi backup data (minimal ekspor CSV/Excel).

---

## V. DATA DICTIONARY

**1. Tabel User**
| Nama Kolom | Tipe Data | Panjang | Deskripsi |
|---|---|---|---|
| user_id | integer | | Primary Key |
| nama_lengkap | varchar | 100 | Nama lengkap pengguna |
| username | varchar | 50 | Nama akun pengguna |
| password | varchar | 255 | Password terenkripsi |
| role | enum | | Peran: Admin, User |
| email | varchar | 100 | Email pengguna |
| lembaga | varchar | 100 | Nama lembaga/instansi asal pengguna (misalnya: SMK, Jurusan, Unit kerja) |

**2. Tabel Kategori**
| Nama Kolom | Tipe Data | Panjang | Deskripsi |
|---|---|---|---|
| kategori_id | integer | | Primary key |
| kode_kategori | varchar | 20 | Kode unik kategori (EL, FR, dll) |
| nama_kategori | varchar | 100 | Nama kategori barang |
| deskripsi | text | | Keterangan tambahan |
| dibuat_pada | datetime | | Waktu kategori dibuat |

**3. Tabel Lokasi**
| Nama Kolom | Tipe Data | Panjang | Deskripsi |
|---|---|---|---|
| lokasi_id | integer | | Primary key |
| kode_lokasi | varchar | 20 | Kode unik lokasi (LAB01, KLS02) |
| nama_lokasi | varchar | 100 | Nama lokasi barang |
| deskripsi | text | | Keterangan tambahan |
| dibuat_pada | datetime | | Waktu lokasi dibuat |

**4. Tabel Barang**
| Nama Kolom | Tipe Data | Panjang | Deskripsi |
|---|---|---|---|
| barang_id | integer | | Primary key |
| kode_barang | varchar | 50 | Kode unik barang |
| nama_barang | varchar | 100 | Nama barang |
| kategori_id | integer | | Foreign key ke tabel kategori |
| lokasi_id | integer | | Foreign key ke tabel lokasi |
| status_barang | enum | | Status: Baik, Rusak Ringan, Rusak Berat, Hilang |
| dibuat_pada | datetime | | Waktu barang dicatat |
| diubah_pada | datetime | | Waktu barang terakhir diperbarui |

**5. Tabel BAST**
| Nama Kolom | Tipe Data | Panjang | Deskripsi |
|---|---|---|---|
| bast_id | integer | | Primary Key |
| barang_id | integer | | Foreign key ke tabel barang |
| user_serah_id | integer | | Foreign key ke tabel user (penyerah) |
| user_terima_id | integer | | Foreign key ke tabel user (penerima) |
| status_serah | enum | | Status approval User Serah: Menunggu, Approved |
| status_terima | enum | | Status approval User Terima: Menunggu, Approved |
| file_export | varchar | 255 | Path file PDF/Excel hasil ekspor |
| dibuat_pada | datetime | | Waktu BAST dibuat |

---

## VI. LAMPIRAN

**Contoh ekspor PDF BAST**

**BERITA ACARA**
**SERAH TERIMA BARANG/ASSET**
**EL/LABKOM-01/BRG001**

Pada hari ini KAMIS tanggal SEBELAS bulan MEI tahun DUA RIBU DUA PULUH LIMA bertempat di ABDEFG, telah dilakukan serah terima barang antara pihak UNIT LOGISTIK DAN ASET dengan UNIT SDM.

Adapun rincian yang diserahterimakan secara lengkap sebagai berikut:

| No. | Nama Barang | Checklist/Keterangan |
| --- | ----------- | -------------------- |
| 1.  | Meja Kantor | Baik                 |

Demikian Berita Acara Serah Terima ini dibuat dengan sebenar-benarnya dan untuk dipergunakan sebagaimana mestinya, serta ditandatangani oleh kedua belah pihak.

**Yang Menyerahkan**
(Tanda Tangan)
Test user serah 1
Unit Logistik dan Aset

**Yang Menerima**
(Tanda Tangan)
Test user terima 1
Unit SDM
