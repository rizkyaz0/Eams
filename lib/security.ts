// lib/security.ts
// Server-only authorization choke point (SEC-06). Every mutating endpoint and
// server action enforces roles through requireRole()/requireRoleOrThrow() so
// the role matrix lives in exactly one place. Never import into client
// components — like lib/auth.ts, this module is server-only.
import { NextResponse } from "next/server";
import { getCurrentUser, hasMinimumRole } from "@/lib/auth";
import type { JWTPayload } from "@/lib/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * Discriminated result of an authorization check: exactly one of `user` or
 * `response` is populated. Route handlers destructure and return early:
 *
 *   const { user, response } = await requireRole(UserRole.STAFF_ASSET);
 *   if (response) return response;
 *
 * After the guard, TypeScript narrows `user` to JWTPayload — no non-null
 * assertions needed at call sites.
 */
export type SecurityResult =
  | { user: JWTPayload; response: null }
  | { user: null; response: NextResponse };

/**
 * Require an authenticated user; returns unauthorizedResponse() when absent.
 * Use on GET handlers that only need "is logged in".
 */
export async function requireUser(): Promise<SecurityResult> {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: unauthorizedResponse() };
  return { user, response: null };
}

/**
 * Require an authenticated user at or above minimumRole; returns
 * unauthorizedResponse() when anonymous and forbiddenResponse() when below
 * the minimum role. Single choke point for the SEC-07 role matrix on all
 * mutating API endpoints.
 */
export async function requireRole(minimumRole: UserRole): Promise<SecurityResult> {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: unauthorizedResponse() };
  if (!hasMinimumRole(user.role, minimumRole)) {
    return { user: null, response: forbiddenResponse("Insufficient role") };
  }
  return { user, response: null };
}

/**
 * requireRole for server actions, which cannot return a NextResponse. Throws
 * on failure, matching the existing assertUser() throw contract (R4): callers
 * catch the error and surface a generic client message.
 */
export async function requireRoleOrThrow(minimumRole: UserRole): Promise<JWTPayload> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!hasMinimumRole(user.role, minimumRole)) {
    throw new Error("Forbidden");
  }
  return user;
}
