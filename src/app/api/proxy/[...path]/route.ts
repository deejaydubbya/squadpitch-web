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

  // getAccessToken auto-refreshes when the access token is expired or
  // about to expire (provided offline_access scope was granted at login,
  // see lib/auth0.ts). If refresh fails — refresh token revoked,
  // expired, or never issued — we surface a recognizable 401 that the
  // client can map to a redirect-to-login. Without this branch the
  // proxy would either pass an expired token (API → 401) or pass no
  // token at all, and the user would just see a generic API error.
  let token: string | null = null;
  try {
    const session = await auth0.getSession(request);
    if (!session) {
      return sessionExpiredResponse('No active session.');
    }
    const at = await auth0.getAccessToken();
    token = at?.token ?? null;
  } catch (err) {
    console.warn('[proxy] getAccessToken failed:', (err as Error)?.message);
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
