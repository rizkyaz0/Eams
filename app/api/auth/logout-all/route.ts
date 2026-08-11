// app/api/auth/logout-all/route.ts
import { getCurrentUser, bumpTokenVersion, clearAuthCookie } from "@/lib/auth";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";

/**
 * POST /api/auth/logout-all - Revoke all sessions for the current user (SEC-04)
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  await bumpTokenVersion(user.userId);
  await clearAuthCookie();

  return successResponse(null, "Logged out from all devices");
}
