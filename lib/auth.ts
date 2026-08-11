// lib/auth.ts
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload as JoseJWTPayload } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { requireEnv } from "@/lib/env";
import db from "@/lib/db";

// JWT secret must come from the environment — a missing secret throws at module
// load (SEC-01). There is deliberately no fallback constant.
const JWT_SECRET = requireEnv("JWT_SECRET");
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

const TOKEN_NAME = "auth-token";

// Pinned claims (SEC-03): tokens are only accepted when these match.
const TOKEN_ISSUER = "eams";
const TOKEN_AUDIENCE = "eams-web";

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  tokenVersion: number;
}

/**
 * Hash password menggunakan bcrypt (12 rounds)
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
 * Runtime claim validator: verifies a decoded payload satisfies the strict
 * JWTPayload shape. Signature validity is not claim validity — every verified
 * payload goes through this before it is trusted as a JWTPayload.
 */
export function parseClaims(value: unknown): JWTPayload | null {
  if (typeof value !== "object" || value === null) return null;

  const claims = value as Record<string, unknown>;
  const { userId, email, fullName, role, tokenVersion } = claims;

  if (
    typeof userId !== "string" ||
    typeof email !== "string" ||
    typeof fullName !== "string" ||
    typeof tokenVersion !== "number" ||
    typeof role !== "string" ||
    !Object.prototype.hasOwnProperty.call(ROLE_HIERARCHY, role)
  ) {
    return null;
  }

  return value as JWTPayload;
}

/**
 * Generate a JWT token with pinned issuer/audience, a fresh jti, and the user's
 * tokenVersion claim. The single controlled cast at this boundary adapts the
 * strict JWTPayload to jose's own index-signatured JWTPayload type.
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload } as JoseJWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime("7d") // Token berlaku 7 hari
    .sign(SECRET_KEY);
}

/**
 * Verify a JWT token with pinned issuer, audience, and algorithm, then validate
 * its claims. Stateless — no database access (proxy.ts relies on this); the
 * tokenVersion revocation check lives in getCurrentUser.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify<JWTPayload>(token, SECRET_KEY, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      algorithms: ["HS256"],
    });

    return parseClaims(payload);
  } catch {
    return null;
  }
}

/**
 * Set auth cookie (httpOnly, 7 days)
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
 * Get current user from cookie, rejecting revoked/stale tokens (SEC-04).
 * The tokenVersion check compares the claim against the database here — never
 * inside verifyToken, keeping the proxy gate DB-free.
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME);

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token.value);
  if (!payload) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { tokenVersion: true },
  });

  if (!user || user.tokenVersion !== payload.tokenVersion) {
    return null;
  }

  return payload;
}

/**
 * Clear auth cookie (logout)
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

/**
 * Assert an authenticated session exists, throwing when unauthenticated.
 * Throw contract matches lib/actions/bast-actions.ts.
 */
export async function assertUser(): Promise<JWTPayload> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/**
 * Return exactly the five identity fields of a verified session payload.
 */
export function getUserIdentity(user: JWTPayload): {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  tokenVersion: number;
} {
  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    tokenVersion: user.tokenVersion,
  };
}

/**
 * Increment a user's tokenVersion, revoking every previously issued session
 * (SEC-04). Called on password change and logout-all.
 */
export async function bumpTokenVersion(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
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

// Compile-time guard (BUG-01) — module-level, never executes. Proves the strict
// JWTPayload has no index signature: if one is ever re-added, the suppression
// directive below becomes unused and tsc fails.
// @ts-expect-error - user.id must not compile (BUG-01)
void ({} as JWTPayload).id;
