// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

// Routes that require authentication (Pages & API)
const protectedRoutes = [
  "/dashboard",
  "/assets",
  "/bast",
  "/maintenance",
  "/users",
  "/categories",
  "/locations",
  "/history",
  "/reports",
  "/approvals",
  "/stocktake",
  "/settings",
  "/api/assets",
  "/api/users",
  "/api/bast",
  "/api/maintenance",
  "/api/categories",
  "/api/divisions",
  "/api/locations",
  "/api/reports",
  "/api/dashboard",
  "/api/stocktake",
  "/api/history",
  "/api/approvals",
];

// Routes only accessible when NOT logged in
const authRoutes = ["/login", "/register"];

// IMPORTANT: Project specific naming convention 'proxy' instead of 'middleware'
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for auth API routes (login/register)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get("auth-token")?.value;

  // Check route types
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Verify token
  const user = token ? await verifyToken(token) : null;

  // 1. Redirect to login if accessing protected route without valid token
  if (isProtectedRoute && !user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please login again." }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete("auth-token");
    return response;
  }

  // 2. Redirect to dashboard if accessing auth routes with valid token
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Pass user info to API routes via headers
  // Using the standard Next.js way to continue with request headers
  if (user && pathname.startsWith("/api")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.userId);
    requestHeaders.set("x-user-role", user.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

// For Next.js to recognize it as a proxy export if named differently
export default proxy;

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
