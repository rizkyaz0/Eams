// app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { verifyPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
      include: {
        division: true,
      },
    });

    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return errorResponse("Invalid credentials", 401);
    }

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
      "Login successful",
    );
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Internal server error", 500);
  }
}
