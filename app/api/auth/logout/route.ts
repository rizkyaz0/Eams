// app/api/auth/logout/route.ts
import { clearAuthCookie } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";

export async function POST() {
  await clearAuthCookie();
  return successResponse(null, "Logout successful");
}
