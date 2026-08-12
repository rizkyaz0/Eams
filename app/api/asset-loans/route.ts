import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireUser, requireRole } from "@/lib/security";
import { successResponse, errorResponse } from "@/lib/api-response";
import { AssetStatus, UserRole } from "@prisma/client";

/** GET /api/asset-loans - List all asset loans with optional filters */
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const assetId = searchParams.get("assetId") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status: status as "ACTIVE" | "RETURNED" | "OVERDUE" } : {}),
      ...(assetId ? { assetId } : {}),
    };

    const [loans, total] = await Promise.all([
      prisma.assetLoan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          asset: { select: { id: true, name: true, tagNumber: true, category: { select: { name: true } } } },
          createdBy: { select: { fullName: true } },
        },
      }),
      prisma.assetLoan.count({ where }),
    ]);

    return successResponse({
      data: loans,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get asset loans error:", error);
    return errorResponse("Gagal mengambil data peminjaman");
  }
}

/** POST /api/asset-loans - Create a new asset loan */
export async function POST(request: NextRequest) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const body = await request.json();
    const { assetId, borrowerName, borrowerPosition, purpose, loanDate, expectedReturnDate, notes } = body;

    if (!assetId || !borrowerName || !loanDate) {
      return errorResponse("assetId, borrowerName, dan loanDate wajib diisi", 400);
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return errorResponse("Aset tidak ditemukan", 404);

    const blockedStatuses: AssetStatus[] = [AssetStatus.IN_MAINTENANCE, AssetStatus.BORROWED, AssetStatus.DISPOSED, AssetStatus.MISSING];
    if (blockedStatuses.includes(asset.status)) {
      return errorResponse(`Aset tidak dapat dipinjam karena statusnya: ${asset.status}`, 400);
    }

    const loan = await prisma.$transaction(async (tx) => {
      const created = await tx.assetLoan.create({
        data: {
          assetId,
          borrowerName,
          borrowerPosition: borrowerPosition ?? null,
          purpose: purpose ?? null,
          loanDate: new Date(loanDate),
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          notes: notes ?? null,
          status: "ACTIVE",
          createdById: user.userId,
        },
        include: {
          asset: { select: { id: true, name: true, tagNumber: true } },
          createdBy: { select: { fullName: true } },
        },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: { status: AssetStatus.BORROWED },
      });

      return created;
    });

    return successResponse(loan, "Peminjaman berhasil dibuat");
  } catch (error) {
    console.error("Create asset loan error:", error);
    return errorResponse("Gagal membuat peminjaman");
  }
}
