/**
 * lib/validations.ts
 * Centralized Zod schemas for all forms in this application.
 * Used by react-hook-form via @hookform/resolvers/zod.
 */

import { z } from "zod";

// ─── Asset Schemas ────────────────────────────────────────────────────────────

export const createAssetSchema = z.object({
  name: z.string().min(2, "Nama aset minimal 2 karakter").max(255),
  tagNumber: z.string().min(1, "Tag number wajib diisi").max(100),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  purchaseDate: z.string().min(1, "Tanggal pembelian wajib diisi"),
  purchasePrice: z
    .string()
    .transform((v) => (v ? parseFloat(v) : undefined))
    .optional()
    .refine((v) => v === undefined || v >= 0, "Harga tidak boleh negatif"),
  salvageValue: z
    .string()
    .transform((v) => (v ? parseFloat(v) : undefined))
    .optional()
    .refine((v) => v === undefined || v >= 0, "Nilai sisa tidak boleh negatif"),
  usefulLife: z
    .string()
    .transform((v) => (v ? parseInt(v) : undefined))
    .optional()
    .refine((v) => v === undefined || v > 0, "Masa pakai harus lebih dari 0 bulan"),
  rfidData: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});

export const editAssetSchema = createAssetSchema.extend({
  locationId: z.string().optional(),
  status: z.enum(["AVAILABLE", "IN_USE", "IN_MAINTENANCE", "MISSING", "DISPOSED"]).optional(),
  condition: z.enum(["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE", "TOTAL_LOSS"]).optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type EditAssetInput = z.infer<typeof editAssetSchema>;

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── BAST Schemas ─────────────────────────────────────────────────────────────

export const createBastSchema = z.object({
  type: z.enum(["PROCUREMENT", "ASSIGNMENT", "RETURN", "MUTATION", "MAINTENANCE_OUT", "MAINTENANCE_IN", "DISPOSAL", "STOCK_OPNAME"]),
  description: z.string().max(2000).optional(),
  effectiveDate: z.string().min(1, "Tanggal efektif wajib diisi"),
  recipientName: z.string().max(255).optional(),
  recipientPosition: z.string().max(255).optional(),
  assetIds: z.array(z.string()).min(1, "Pilih minimal 1 aset"),
});

export type CreateBastInput = z.infer<typeof createBastSchema>;

// ─── User Schemas ─────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  fullName: z.string().min(2, "Nama minimal 2 karakter").max(255),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter").regex(/[A-Z]/, "Harus mengandung huruf kapital").regex(/[0-9]/, "Harus mengandung angka"),
  nip: z.string().max(50).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET", "TEKNISI", "EMPLOYEE"]),
  divisionId: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ─── Maintenance Schemas ──────────────────────────────────────────────────────

export const createMaintenanceSchema = z.object({
  description: z.string().min(5, "Deskripsi minimal 5 karakter"),
  vendorName: z.string().max(255).optional(),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  estimatedCost: z
    .string()
    .transform((v) => (v ? parseFloat(v) : undefined))
    .optional(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
