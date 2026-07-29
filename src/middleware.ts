import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { safeReturnTo } from "@/lib/authFlow";

// Public pages reachable without an authenticated session.
// Keep in sync with the (public) route group and any new legal/trust pages.
// Exported so tests can lock in the contract.
export const PUBLIC_PATHS = [
  "/",
  "/privacy",
  "/terms",
  "/contact",
  "/data-deletion",
  "/help",
  "/sms-consent",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const authResponse = await auth0.middleware(request);

    // Let Auth0 handle /auth/* routes
    if (pathname.startsWith("/auth/")) return authResponse;

    // Public paths — no auth needed
    if (PUBLIC_PATHS.includes(pathname)) return authResponse;

    // API proxy — forward without auth check (Auth0 token attached by proxy)
    if (pathname.startsWith("/api/")) return authResponse;

    // OAuth callbacks — no auth needed
    if (pathname.startsWith("/oauth/")) return authResponse;

    // Media proxy — no auth (TikTok's PULL_FROM_URL verifier fetches
    // media without credentials). The route itself only allows our
    // own Cloudinary cloud, so it can't be used as an open relay.
    if (pathname.startsWith("/media-proxy/")) return authResponse;

    // All other paths require authentication
    const session = await auth0.getSession(request);
    if (!session) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set(
        "returnTo",
        safeReturnTo(`${pathname}${request.nextUrl.search}`, "/workspaces"),
      );
      return NextResponse.redirect(loginUrl);
    }

    return authResponse;
  } catch (error) {
    console.error(`[middleware] Error on ${pathname}:`, error);
    // Public content remains available if the identity provider is having an
    // outage. Protected content fails closed and returns to a public surface.
    if (PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next();
    }
    const errorUrl = new URL("/", request.url);
    errorUrl.searchParams.set("auth_error", "auth_unavailable");
    return NextResponse.redirect(errorUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|icon\\.png|apple-icon\\.png|icon-.*\\.png|logo.*\\.png|squadpitch-.*\\.(?:png|jpg|jpeg|webp|mp4|webm)|sw\\.js|sitemap\\.xml|robots\\.txt|.*\\.txt$).*)",
  ],
};
