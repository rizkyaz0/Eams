// app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { verifyPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

// Rate limit: max 10 login attempts per IP per 15 minutes
const RATE_LIMIT_OPTIONS = { limit: 10, windowMs: 15 * 60 * 1000 };

export async function POST(request: NextRequest) {
  // ✅ RATE LIMITING — block brute-force attempts
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "127.0.0.1";

  const rateLimitResult = checkRateLimit(`login:${ip}`, RATE_LIMIT_OPTIONS);

  if (!rateLimitResult.success) {
    const resetIn = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 60000);
    return errorResponse(`Terlalu banyak percobaan login. Coba lagi dalam ${resetIn} menit.`, 429);
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return errorResponse("Email dan password wajib diisi", 400);
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
      include: { division: true },
    });

    if (!user) {
      return errorResponse("Email atau password salah", 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return errorResponse("Email atau password salah", 401);
    }

    // ✅ Reset rate limit on successful login
    resetRateLimit(`login:${ip}`);

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
      "Login berhasil",
    );
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Terjadi kesalahan server", 500);
  }
}
