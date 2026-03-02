// app/api/auth/me/route.ts
import { getCurrentUser } from "@/lib/auth";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";
import db from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  // Get full user data from database
  const userData = await db.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      nip: true,
      role: true,
      division: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!userData) {
    return unauthorizedResponse();
  }

  return successResponse(userData);
}
