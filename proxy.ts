// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

// Every entry in this set is a deliberate public route — exact match only.
const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/api/auth/login", "/api/auth/register"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public allow-list: pass through without a token
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get("auth-token");

  // Verify token if present — stateless JWT verification only, no DB read (fast gate)
  let user = null;
  if (token) {
    user = await verifyToken(token.value);
  }

  // Deny-by-default: unauthenticated requests are rejected
  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
