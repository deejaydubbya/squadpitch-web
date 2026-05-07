import { NextResponse, type NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';

// Public pages reachable without an authenticated session.
// Keep in sync with the (public) route group and any new legal/trust pages.
// Exported so tests can lock in the contract.
export const PUBLIC_PATHS = ['/', '/privacy', '/terms', '/help', '/sms-consent'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const authResponse = await auth0.middleware(request);

    // Let Auth0 handle /auth/* routes
    if (pathname.startsWith('/auth/')) return authResponse;

    // Public paths — no auth needed
    if (PUBLIC_PATHS.includes(pathname)) return authResponse;

    // API proxy — forward without auth check (Auth0 token attached by proxy)
    if (pathname.startsWith('/api/')) return authResponse;

    // OAuth callbacks — no auth needed
    if (pathname.startsWith('/oauth/')) return authResponse;

    // All other paths require authentication
    const session = await auth0.getSession(request);
    if (!session) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return authResponse;
  } catch (error) {
    console.error(`[middleware] Error on ${pathname}:`, error);
    // On auth errors, redirect to home rather than showing a 500
    if (pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|icon\\.png|apple-icon\\.png|icon-.*\\.png|logo.*\\.png|squadpitch-.*\\.(?:png|jpg|jpeg|webp|mp4|webm)|sw\\.js|sitemap\\.xml|robots\\.txt|.*\\.txt$).*)',
  ],
};
