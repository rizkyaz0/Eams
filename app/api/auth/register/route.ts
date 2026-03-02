// app/api/auth/register/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { hashPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, nip, role, divisionId } = body;

    // Validation
    if (!email || !password || !fullName) {
      return errorResponse("Email, password, and full name are required", 400);
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse("User with this email already exists", 409);
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
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        nip: nip || null,
        role: (role as UserRole) || UserRole.EMPLOYEE,
        divisionId: divisionId || null,
      },
      include: {
        division: true,
      },
    });

    // Generate token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    // Set cookie
    await setAuthCookie(token);

    // Return user data (without password)
    return successResponse(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        nip: user.nip,
        role: user.role,
        division: user.division,
      },
      "Registration successful",
      201,
    );
  } catch (error) {
    console.error("Registration error:", error);
    return errorResponse("Internal server error", 500);
  }
}
