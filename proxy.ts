import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const SIGN_IN_PATH = "/signin";

const PROTECTED_PAGE_PREFIXES = ["/dashboard"];

const PROTECTED_API_PREFIXES = [
  "/api/dashboard",
  "/api/telemetry",
  "/api/profile",
  "/api/auth/unlink",
  "/api/auth/solana/link",
  "/api/auth/solana/link-nonce",
  "/api/auth/google/link/start",
  "/api/mint/jobs",
];

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  // Keep signed-in users out of the sign-in page.
  if (pathname === SIGN_IN_PATH && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedPage(pathname) && !token) {
    const signInUrl = new URL(SIGN_IN_PATH, request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isProtectedApi(pathname) && !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/signin",
    "/api/dashboard/:path*",
    "/api/telemetry/:path*",
    "/api/profile/:path*",
    "/api/auth/unlink/:path*",
    "/api/auth/solana/link/:path*",
    "/api/auth/solana/link-nonce/:path*",
    "/api/auth/google/link/start/:path*",
    "/api/mint/jobs/:path*",
  ],
};
