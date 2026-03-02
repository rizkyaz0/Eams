// app/api/users/[id]/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser, hashPassword, hasMinimumRole } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

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
    const updateData: any = {};

    if (body.fullName) updateData.fullName = body.fullName;
    if (body.nip) updateData.nip = body.nip;
    if (body.divisionId !== undefined) updateData.divisionId = body.divisionId;

    // Only admins can change role
    if (body.role && hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)) {
      updateData.role = body.role;
    }

    // If password is being changed
    if (body.password) {
      updateData.password = await hashPassword(body.password);
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
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  // Only admins can delete users
  if (!hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)) {
    return forbiddenResponse("Only admins can delete users");
  }

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
