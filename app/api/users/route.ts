// app/api/users/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser, hashPassword, hasMinimumRole } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * GET /api/users - Get all users (Admin only)
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  // Only ADMIN and above can view all users
  if (!hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)) {
    return forbiddenResponse("Only admins can view all users");
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const role = searchParams.get("role") as UserRole | null;
    const divisionId = searchParams.get("divisionId");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (divisionId) {
      where.divisionId = divisionId;
    }

    if (search) {
      where.OR = [{ fullName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { nip: { contains: search, mode: "insensitive" } }];
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          nip: true,
          lembaga: true,
          role: true,
          isActive: true,
          divisionId: true,
          division: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assetsHeld: true,
              createdBasts: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.user.count({ where }),
    ]);

    return successResponse({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return errorResponse("Failed to fetch users", 500);
  }
}

/**
 * POST /api/users - Create new user (Admin only)
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  // Only ADMIN and above can create users
  if (!hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)) {
    return forbiddenResponse("Only admins can create users");
  }

  try {
    const body = await request.json();
    const { email, password, fullName, nip, username, lembaga, role, divisionId } = body;

    // Validation
    if (!email || !password || !fullName || !username) {
      return errorResponse("Email, password, nama lengkap, dan username wajib diisi", 400);
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse("User with this email already exists", 409);
    }

    // Check if username already exists
    if (username) {
      const existingUsername = await db.user.findUnique({ where: { username } });
      if (existingUsername) {
        return errorResponse("Username sudah digunakan", 409);
      }
    }

    // Check NIP uniqueness if provided
    if (nip) {

      const existingNip = await db.user.findUnique({
        where: { nip },
      });

      if (existingNip) {
        return errorResponse("User with this NIP already exists", 409);
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await db.user.create({
      data: {
        email,
        username: username || null,
        password: hashedPassword,
        fullName,
        nip: nip || null,
        lembaga: lembaga || null,
        role: (role as UserRole) || UserRole.EMPLOYEE,
        divisionId: divisionId || null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        nip: true,
        lembaga: true,
        role: true,
        division: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(newUser, "User berhasil dibuat", 201);

  } catch (error) {
    console.error("Create user error:", error);
    return errorResponse("Failed to create user", 500);
  }
}
