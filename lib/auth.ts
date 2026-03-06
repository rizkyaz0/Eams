// lib/auth.ts
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";

// Secret key untuk JWT
if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable must be set. Application cannot start securely.");
}
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

const TOKEN_NAME = "auth-token";

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  [key: string]: unknown; // Required for jose compatibility
}

/**
 * Hash password menggunakan bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify password dengan hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate JWT token
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Token berlaku 7 hari
    .sign(SECRET_KEY);
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);

    // Validate payload has required fields
    if (typeof payload.userId === "string" && typeof payload.email === "string" && typeof payload.role === "string" && typeof payload.fullName === "string") {
      return payload as JWTPayload;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Set auth cookie
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Get current user from cookie
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME);

  if (!token) {
    return null;
  }

  return verifyToken(token.value);
}

/**
 * Clear auth cookie (logout)
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Role hierarchy untuk authorization
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  ADMIN_INSTANSI: 4,
  STAFF_ASSET: 3,
  TEKNISI: 2,
  EMPLOYEE: 1,
};

/**
 * Check if user role is higher or equal to required role
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
