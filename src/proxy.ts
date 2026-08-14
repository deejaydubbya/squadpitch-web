import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { safeReturnTo } from "@/lib/authFlow";
import { mainMarketingRedirect } from "@/lib/marketingHostRedirect";

export const PUBLIC_PATHS = [
  "/",
  "/privacy",
  "/terms",
  "/contact",
  "/data-deletion",
  "/help",
  "/sms-consent",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const marketingDestination = mainMarketingRedirect(
    request.headers.get("host"),
    pathname,
    request.nextUrl.search,
  );
  if (marketingDestination) {
    return NextResponse.redirect(marketingDestination, 308);
  }

  try {
    const authResponse = await auth0.middleware(request);

    if (pathname.startsWith("/auth/")) return authResponse;
    if (PUBLIC_PATHS.includes(pathname)) return authResponse;
    if (pathname.startsWith("/preview/")) return authResponse;
    if (pathname.startsWith("/r/")) return authResponse;
    if (pathname.startsWith("/api/public/prospects/")) return authResponse;
    if (pathname.startsWith("/api/")) return authResponse;
    if (pathname.startsWith("/oauth/")) return authResponse;
    if (pathname.startsWith("/media-proxy/")) return authResponse;

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
    console.error(`[proxy] Error on ${pathname}:`, error);
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
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|icon\\.png|apple-icon\\.png|icon-.*\\.png|logo.*\\.png|squadpitch-.*\\.(?:png|jpg|jpeg|webp|mp4|webm)|sw\\.js|manifest\\.webmanifest|sitemap\\.xml|robots\\.txt|.*\\.txt$).*)",
  ],
};
