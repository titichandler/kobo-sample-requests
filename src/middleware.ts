import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, getAuthSecret, isValidSessionToken } from "@/lib/session";

function isProtectedApiPath(pathname: string, method: string): boolean {
  if (pathname === "/api/requests" && method === "GET") {
    return true;
  }
  if (pathname === "/api/review-board" && method === "GET") {
    return true;
  }
  if (pathname.startsWith("/api/lines/") && method === "PATCH") {
    return true;
  }
  if (pathname.startsWith("/api/requests/") && (method === "GET" || method === "PATCH")) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && !isProtectedApiPath(pathname, request.method)) {
    return NextResponse.next();
  }

  const secret = getAuthSecret();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await isValidSessionToken(token, secret);

  if (authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/requests",
    "/requests/:path*",
    "/api/requests",
    "/api/requests/:path*",
    "/api/review-board",
    "/api/lines/:path*",
  ],
};
