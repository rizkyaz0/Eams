# 📖 EAMS User Guide

## 🎯 Overview

**EAMS (Enterprise Asset Management System)** adalah sistem manajemen aset perusahaan yang memungkinkan Anda untuk tracking, managing, dan melakukan serah terima aset secara terorganisir.

---

## 🚀 Quick Start

### Login Credentials

```
Email: admin@eams.com
Password: admin123
```

---

## 📋 Main Features & Workflows

### 1. 🏢 **ASSET MANAGEMENT**

#### Viewing Assets

1. Klik **"Assets"** di sidebar
2. Anda akan melihat daftar semua aset
3. Gunakan **search box** untuk cari berdasarkan nama atau tag number
4. Gunakan **filter** untuk menyaring berdasarkan:
   - **Status**: Available, In Use, Maintenance, Missing, Disposed
   - **Category**: Elektronik, Furniture, Kendaraan, dll

#### Creating New Asset

1. Klik tombol **"Add Asset"**
2. Isi form:
   - **Asset Name** \* (Required)
   - **Tag Number** \* (Required) - Nomor identifikasi unik
   - **Category** \* (Required)
   - **Purchase Date** \* (Required)
   - **Purchase Price** (Optional)
   - **Description** (Optional)
3. Klik **"Create Asset"**
4. Toast notification akan muncul di pojok kanan atas
5. Asset baru akan otomatis ter-assign status "AVAILABLE"

#### Editing Asset

1. Di halaman Assets, klik icon **⋮** (three dots) pada asset yang ingin diedit
2. Pilih **"Edit"**
3. Dialog akan terbuka dengan data ter-isi
4. Ubah field yang diperlukan:
   - Name, Tag Number
   - Category, Location
   - Status, Condition
   - Purchase Date, Price
   - Description
5. Klik **"Update Asset"**

#### Viewing Asset Details

1. Klik icon **⋮** → **"View Details"**, ATAU
2. Klik pada row asset di table
3. Anda akan diarahkan ke halaman detail yang menampilkan:
   - Full asset information
   - Status & condition
   - Purchase details
   - QR code (untuk scanning)
   - Created/Updated timestamps

#### Deleting Asset

1. Klik icon **⋮** → **"Delete"**
2. Confirmation dialog akan muncul
3. Klik **"Delete"** untuk konfirmasi
4. Asset akan terhapus permanent dari database

---

### 2. 📝 **BAST MANAGEMENT** (Berita Acara Serah Terima)

#### What is BAST?

BAST adalah dokumen resmi untuk mencatat:

- **Handover**: Serah terima aset ke user/divisi
- **Return**: Pengembalian aset dari user
- **Transfer**: Perpindahan aset antar divisi/lokasi
- **Disposal**: Penghapusan aset

#### Creating BAST (2-Step Process)

**STEP 1: Basic Information**

1. Klik **"BAST"** di sidebar
2. Klik tombol **"Create BAST"**
3. Isi data dasar:
   - **BAST Type** \* (Required):
     - Handover (Serah Terima)
     - Return (Pengembalian)
     - Transfer (Pemindahan)
     - Disposal (Penghapusan)
   - **Recipient Name** \* (Required) - Nama penerima
   - **Recipient Position** (Optional) - Jabatan penerima
   - **Notes** (Optional) - Catatan tambahan
4. Klik **"Next"**

**STEP 2: Select Assets**

1. Anda akan melihat daftar asset yang **AVAILABLE**
2. **Centang checkbox** pada asset yang ingin dimasukkan ke BAST
3. Bisa pilih multiple assets sekaligus
4. Counter akan menampilkan jumlah asset terpilih
5. Klik **"Create BAST"**
6. BAST akan dibuat dengan status **"DRAFT"**

#### BAST Status Flow

```
DRAFT → PENDING → APPROVED ✅
                 → REJECTED ❌
```

- **DRAFT**: Baru dibuat, bisa diedit
- **PENDING**: Menunggu approval
- **APPROVED**: Disetujui, asset status terupdate
- **REJECTED**: Ditolak

#### Viewing BAST Details

1. Klik tombol **"View"** pada BAST di table
2. Anda akan melihat:
   - BAST information (type, status, recipient)
   - Creator info
   - List of assets dalam BAST
   - Approval status

#### Approving/Rejecting BAST

**Note**: Fitur ini biasanya untuk Manager/Admin

1. Buka BAST detail (status **PENDING**)
2. Klik tombol **"Approve"** atau **"Reject"**
3. Confirmation dialog akan muncul
4. Confirm pilihan Anda
5. Jika **APPROVED**:
   - Asset status akan terupdate sesuai BAST type
   - Approver name & timestamp tercatat
   - BAST bisa di-download sebagai PDF

---

### 3. 📊 **DASHBOARD**

Dashboard menampilkan overview sistem:

#### Statistics Cards

- **Total Assets**: Jumlah total semua aset
- **Available**: Aset yang siap digunakan
- **In Use**: Aset yang sedang dipakai
- **Maintenance**: Aset dalam perbaikan

#### Charts

- **Assets by Category**: Bar chart distribusi aset per kategori
- Grafik interaktif untuk visualisasi data

#### Recent BAST

- List BAST terbaru dengan status badges
- Quick view untuk monitoring aktivitas serah terima

---

## 🎨 UI Features

### Sidebar Navigation

- **Active indicator**: Menu yang sedang aktif akan ter-highlight dengan:
  - Background warna accent
  - Font weight bold
- **Icons**: Setiap menu punya icon yang jelas
- **Collapsible**: Sidebar bisa di-collapse untuk layar kecil

### Toast Notifications (Sonner)

Notifikasi akan muncul di pojok kanan atas untuk:

- ✅ **Success**: Border hijau (Create, Update, Delete berhasil)
- ❌ **Error**: Border merah (Validasi gagal, server error)
- ℹ️ **Info**: Border biru (Informasi umum)

### Status Badges

- **Available**: Badge hijau
- **In Use**: Badge biru
- **Maintenance**: Badge orange
- **Missing**: Badge merah
- **Disposed**: Badge abu-abu

---

## 🔧 Troubleshooting

### Issue: Cannot Edit/Delete Asset

**Possible Causes:**

1. Asset sedang digunakan dalam BAST yang PENDING
2. Koneksi ke backend terputus
3. Browser cache issue

**Solutions:**

1. Check apakah ada BAST pending yang menggunakan asset tersebut
2. Refresh halaman (F5)
3. Clear browser cache: Ctrl+Shift+Delete
4. Check console untuk error messages (F12)

### Issue: Create BAST Error

**Common errors & fixes:**

**Error: "Please select at least one asset"**

- Solution: Centang minimal 1 asset di step 2

**Error: "No available assets"**

- Solution: Pastikan ada asset dengan status AVAILABLE
- Cekdi halaman Assets

**Error: "Failed to create BAST"**

- Solution: Check required fields terisi semua
- Pastikan koneksi internet stabil
- Check browser console (F12) untuk detail error

### Issue: Sidebar Not Showing Active State

- Solution: Refresh browser
- This should now be fixed dengan update terbaru

### Issue: Toast Not Showing

- Solution: Check apakah ada error di console
- Pastikan Sonner component ter-load di layout

---

## 💡 Tips & Best Practices

### Asset Management

1. **Gunakan naming convention** yang konsisten untuk tag number
   - Example: `AST-IT-001`, `AST-FUR-001`
2. **Update status asset** secara berkala
3. **Tambahkan description** yang detail untuk memudahkan tracking
4. **Upload QR code** ke sistem untuk easy scanning

### BAST Management

1. **Review data** sebelum submit BAST
2. **Gunakan notes field** untuk informasi tambahan penting
3. **Approve/reject promptly** untuk menjaga workflow lancar
4. **Download PDF** setelah approved untuk dokumentasi

### General

1. **Logout** setelah selesai menggunakan sistem
2. **Gunakan search** daripada scroll manual untuk cari data
3. **Filter** berdasarkan status untuk mempersempit hasil

---

## 📞 Support

Jika mengalami masalah atau butuh bantuan:

1. Check troubleshooting guide di atas
2. Open browser console (F12) untuk lihat error details
3. Screenshot error message
4. Contact IT support dengan informasi error

---

## 🔄 Version History

### v1.0.0 (Current)

- Asset Management (CRUD)
- BAST Management (Create & Approval)
- Dashboard dengan real-time statistics
- Active sidebar navigation
- Toast notifications
- Responsive design

---

**Last Updated**: 2026-02-11
**System Version**: 1.0.0
