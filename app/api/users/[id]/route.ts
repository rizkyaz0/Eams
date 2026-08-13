// app/api/users/[id]/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword, hasMinimumRole, bumpTokenVersion } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { requireRole } from "@/lib/security";
import { Prisma, UserRole } from "@prisma/client";

/**
 * GET /api/users/[id] - Get single user
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    // Users can only view their own profile unless they're admin
    if (user.userId !== id && !hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)) {
      return forbiddenResponse("You can only view your own profile");
    }

    const userData = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        nip: true,
        role: true,
        division: true,
        createdAt: true,
        updatedAt: true,
        assetsHeld: {
          select: {
            id: true,
            name: true,
            tagNumber: true,
            status: true,
            condition: true,
          },
        },
      },
    });

    if (!userData) {
      return notFoundResponse("User not found");
    }

    return successResponse(userData);
  } catch (error) {
    console.error("Get user error:", error);
    return errorResponse("Failed to fetch user", 500);
  }
}

/**
 * PATCH /api/users/[id] - Update user
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Users can only update their own profile unless they're admin
    if (user.userId !== id && !hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)) {
      return forbiddenResponse("You can only update your own profile");
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return notFoundResponse("User not found");
    }

    // Prepare update data
    const updateData: Prisma.UserUncheckedUpdateInput = {};

    if (body.fullName) updateData.fullName = body.fullName;
    if (body.nip) updateData.nip = body.nip;
    if (body.divisionId !== undefined) updateData.divisionId = body.divisionId;

    // Only admins can change role
    if (body.role && hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)) {
      updateData.role = body.role;
    }

    // If password is being changed
    let passwordChanged = false;
    if (body.password) {
      // Non-admins must provide current password when changing their own password
      const isSelf = user.userId === id;
      const isAdmin = hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI);
      if (isSelf && !isAdmin) {
        if (!body.currentPassword) {
          return errorResponse("Password saat ini diperlukan", 400);
        }
        const valid = await verifyPassword(body.currentPassword, existingUser.password);
        if (!valid) {
          return errorResponse("Password saat ini tidak valid", 400);
        }
      }
      updateData.password = await hashPassword(body.password);
      passwordChanged = true;
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        nip: true,
        role: true,
        division: true,
        updatedAt: true,
      },
    });

    // Password change revokes all previously issued sessions (SEC-04)
    if (passwordChanged) {
      await bumpTokenVersion(id);
    }

    return successResponse(updatedUser, "User updated successfully");
  } catch (error) {
    console.error("Update user error:", error);
    return errorResponse("Failed to update user", 500);
  }
}

/**
 * DELETE /api/users/[id] - Delete user (Admin only)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.ADMIN_INSTANSI);
  if (response) return response;

  try {
    const { id } = await params;

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return notFoundResponse("User not found");
    }

    // Prevent self-deletion
    if (user.userId === id) {
      return errorResponse("You cannot delete your own account", 403);
    }

    // Delete user
    await db.user.delete({
      where: { id },
    });

    return successResponse(null, "User deleted successfully");
  } catch (error) {
    console.error("Delete user error:", error);
    return errorResponse("Failed to delete user", 500);
  }
}
