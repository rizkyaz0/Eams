// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

// Routes yang memerlukan authentication
const protectedRoutes = ["/dashboard", "/api/assets", "/api/users", "/api/bast", "/api/maintenance", "/api/categories", "/api/divisions", "/api/locations"];

// Routes yang hanya bisa diakses saat belum login
const authRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for auth login/register API
  if (pathname === "/api/auth/login" || pathname === "/api/auth/register") {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get("auth-token");

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Verify token if exists
  let user = null;
  if (token) {
    user = await verifyToken(token.value);
  }

  // Redirect to login if accessing protected route without valid token
  if (isProtectedRoute && !user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if accessing auth routes with valid token
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Add user to headers for API routes
  if (user && pathname.startsWith("/api")) {
    const response = NextResponse.next();
    response.headers.set("x-user-id", user.userId);
    response.headers.set("x-user-role", user.role);
    return response;
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
