// app/api/settings/reset-data/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * POST /api/settings/reset-data
 * Hanya SUPER_ADMIN yang bisa mengakses endpoint ini.
 * Menghapus semua data transaksi (BAST, Maintenance, StockTake, AuditLog, Alert)
 * dan me-reset status semua aset ke AVAILABLE.
 * Data master (User, Division, Location, Category) TIDAK dihapus.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return forbiddenResponse("Hanya Super Admin yang dapat mereset data");
  }

  try {
    // Jalankan semua penghapusan dalam satu transaksi
    await db.$transaction([
      // 1. Hapus detail BAST terlebih dahulu (child)
      db.bastDetail.deleteMany({}),
      // 2. Hapus semua BAST
      db.bast.deleteMany({}),
      // 3. Hapus maintenance
      db.maintenance.deleteMany({}),
      // 4. Hapus stock take details (child)
      db.stockTakeDetail.deleteMany({}),
      // 5. Hapus stock takes
      db.stockTake.deleteMany({}),
      // 6. Hapus audit logs
      db.auditLog.deleteMany({}),
      // 7. Hapus asset alerts
      db.assetAlert.deleteMany({}),
      // 8. Hapus maintenance predictions
      db.maintenancePrediction.deleteMany({}),
      // 9. Reset semua aset ke status awal
      db.asset.updateMany({
        data: {
          status: "AVAILABLE",
          holderId: null,
          condition: "GOOD",
        },
      }),
    ]);

    return successResponse(null, "Semua data transaksi berhasil direset. Data master (user, divisi, lokasi, kategori) tetap ada.");
  } catch (error: any) {
    console.error("Reset data error:", error);
    return errorResponse(error.message || "Gagal mereset data", 500);
  }
}
