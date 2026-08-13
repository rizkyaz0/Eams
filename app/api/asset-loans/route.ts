import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireUser, requireRole } from "@/lib/security";
import { successResponse, errorResponse } from "@/lib/api-response";
import { AssetStatus, UserRole } from "@prisma/client";

/** Generate batch number: LOAN/YYYY/MM/NNN */
async function generateBatchNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `LOAN/${year}/${month}`;
  const count = await prisma.assetLoanBatch.count({
    where: { batchNumber: { startsWith: prefix } },
  });
  return `${prefix}/${String(count + 1).padStart(3, "0")}`;
}

/** GET /api/asset-loans - List all loan batches */
export async function GET(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") ?? "10"));
    const skip = (page - 1) * limit;

    const where: any = status ? { status: status as "ACTIVE" | "COMPLETED" | "CANCELLED" } : {};

    // MR can only see batches containing assets from their division
    if (user.role === UserRole.MR) {
      const divisionId = user.divisionId ?? "NO_DIVISION_ASSIGNED";
      where.items = { some: { asset: { divisionId } } };
    }

    const [batches, total] = await Promise.all([
      prisma.assetLoanBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { fullName: true } },
          items: {
            include: {
              asset: { select: { id: true, name: true, tagNumber: true, category: { select: { name: true } } } },
            },
          },
        },
      }),
      prisma.assetLoanBatch.count({ where }),
    ]);

    return successResponse({
      data: batches,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get asset loan batches error:", error);
    return errorResponse("Gagal mengambil data peminjaman");
  }
}

/** POST /api/asset-loans - Create a loan batch with multiple assets */
export async function POST(request: NextRequest) {
  const { user, response } = await requireRole(UserRole.MR);
  if (response) return response;

  try {
    const body = await request.json();
    const { assetIds, borrowerName, borrowerPosition, purpose, loanDate, expectedReturnDate, notes } = body;

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return errorResponse("Pilih minimal satu aset", 400);
    }
    if (!borrowerName || !loanDate) {
      return errorResponse("borrowerName dan loanDate wajib diisi", 400);
    }

    const blockedStatuses: AssetStatus[] = [
      AssetStatus.IN_MAINTENANCE,
      AssetStatus.BORROWED,
      AssetStatus.DISPOSED,
      AssetStatus.MISSING,
    ];

    const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
    if (assets.length !== assetIds.length) {
      return errorResponse("Satu atau lebih aset tidak ditemukan", 404);
    }
    const blocked = assets.filter((a) => blockedStatuses.includes(a.status));
    if (blocked.length > 0) {
      return errorResponse(
        `Aset berikut tidak dapat dipinjam: ${blocked.map((a) => a.tagNumber).join(", ")}`,
        400
      );
    }

    const batchNumber = await generateBatchNumber();

    const batch = await prisma.$transaction(async (tx) => {
      const created = await tx.assetLoanBatch.create({
        data: {
          batchNumber,
          borrowerName,
          borrowerPosition: borrowerPosition ?? null,
          purpose: purpose ?? null,
          loanDate: new Date(loanDate),
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          notes: notes ?? null,
          status: "ACTIVE",
          createdById: user.userId,
          items: {
            create: assetIds.map((assetId: string) => ({ assetId, status: "ACTIVE" })),
          },
        },
        include: {
          createdBy: { select: { fullName: true } },
          items: { include: { asset: { select: { id: true, name: true, tagNumber: true } } } },
        },
      });

      await tx.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { status: AssetStatus.BORROWED },
      });

      return created;
    });

    return successResponse(batch, "Peminjaman berhasil dibuat");
  } catch (error) {
    console.error("Create asset loan batch error:", error);
    return errorResponse("Gagal membuat peminjaman");
  }
}
