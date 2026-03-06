// app/api/divisions/[id]/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser, hasMinimumRole } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * PATCH /api/divisions/[id] - Update a division
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  if (!hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)) return forbiddenResponse("Only admins can update divisions");

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    const existing = await db.division.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Division not found");

    const updated = await db.division.update({
      where: { id },
      data: { name: name || existing.name, description: description !== undefined ? description : existing.description },
    });

    return successResponse(updated, "Division updated successfully");
  } catch (error) {
    console.error("Update division error:", error);
    return errorResponse("Failed to update division", 500);
  }
}

/**
 * DELETE /api/divisions/[id] - Delete a division
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  if (!hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)) return forbiddenResponse("Only admins can delete divisions");

  try {
    const { id } = await params;

    const existing = await db.division.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!existing) return notFoundResponse("Division not found");

    if (existing._count.users > 0) {
      return errorResponse(`Tidak bisa menghapus divisi yang masih memiliki ${existing._count.users} pengguna aktif. Pindahkan pengguna terlebih dahulu.`, 409);
    }

    await db.division.delete({ where: { id } });
    return successResponse(null, "Division deleted successfully");
  } catch (error) {
    console.error("Delete division error:", error);
    return errorResponse("Failed to delete division", 500);
  }
}
