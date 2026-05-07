import { auth0 } from '@/lib/auth0';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Allow large request bodies for campaign image uploads (base64 payloads)
export const maxDuration = 60;

const API_URL = process.env.SQUADPITCH_API_URL || 'http://localhost:4000';

// Returned when the user's session can't produce a valid access token
// (no session, refresh token missing/expired, or Auth0 refresh call
// failed). The client sees `code: 'SESSION_EXPIRED'` and redirects.
function sessionExpiredResponse(message: string) {
  return NextResponse.json(
    { error: 'SESSION_EXPIRED', code: 'SESSION_EXPIRED', message },
    { status: 401 }
  );
}

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${API_URL}/api/v1/${path}${request.nextUrl.search}`;

  // Token strategy:
  //   1. Read the session. If there is none, return SESSION_EXPIRED.
  //   2. If the access token still has plenty of life left, use it as-is.
  //      This avoids hitting auth0.getAccessToken() on every request,
  //      which (in v4 Route Handler context) requires (req, res) args
  //      and a writable response — awkward to thread through a proxy.
  //   3. If the token is near or past expiry, attempt a refresh. If
  //      refresh fails (no refresh token, revoked, etc.) we surface a
  //      recognizable 401 so the client redirects to login.
  let token: string | null = null;
  try {
    const session = await auth0.getSession(request);
    if (!session) {
      return sessionExpiredResponse('No active session.');
    }

    const tokenSet = (session as any).tokenSet ?? null;
    const accessToken: string | undefined = tokenSet?.accessToken;
    // expiresAt is typically unix seconds in v4; tolerate ms just in case.
    const rawExpiresAt: number | undefined = tokenSet?.expiresAt;
    const expiresAtSec = typeof rawExpiresAt === 'number'
      ? (rawExpiresAt > 1e12 ? Math.floor(rawExpiresAt / 1000) : rawExpiresAt)
      : 0;
    const nowSec = Math.floor(Date.now() / 1000);
    const refreshSkewSec = 60;

    if (accessToken && expiresAtSec > nowSec + refreshSkewSec) {
      token = accessToken;
    } else {
      try {
        const at = await auth0.getAccessToken();
        token = at?.token ?? accessToken ?? null;
      } catch (refreshErr) {
        console.warn(
          '[proxy] getAccessToken refresh failed:',
          (refreshErr as Error)?.message
        );
        return sessionExpiredResponse('Your session has expired. Please log in again.');
      }
    }
  } catch (err) {
    console.error('[proxy] session lookup failed:', (err as Error)?.message);
    return sessionExpiredResponse('Your session has expired. Please log in again.');
  }
  if (!token) {
    return sessionExpiredResponse('Your session has expired. Please log in again.');
  }

  const headers: Record<string, string> = {};
  const contentType = request.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  headers['authorization'] = `Bearer ${token}`;

  const body = request.method !== 'GET' && request.method !== 'HEAD'
    ? await request.arrayBuffer()
    : undefined;

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: body ? Buffer.from(body) : undefined,
  });

  // Stream SSE responses instead of buffering
  const resContentType = res.headers.get('content-type') || '';
  if (resContentType.includes('text/event-stream') && res.body) {
    return new NextResponse(res.body as unknown as ReadableStream, {
      status: res.status,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        'x-accel-buffering': 'no',
      },
    });
  }

  const responseBody = await res.arrayBuffer();
  return new NextResponse(responseBody, {
    status: res.status,
    headers: {
      'content-type': resContentType || 'application/json',
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
