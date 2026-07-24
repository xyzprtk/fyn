import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/constants";

const APP_PREFIXES = ["/dashboard", "/upload", "/transactions", "/settings"];

/**
 * Lightweight cookie-presence gate. Middleware runs on the edge runtime with
 * no access to sqlite, so this only checks that a session cookie exists; the
 * (app) layout and route handlers validate the session against the db.
 */
export function middleware(request: NextRequest) {
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (!pathname.startsWith("/api/auth/") && !hasCookie) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (APP_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/transactions/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
