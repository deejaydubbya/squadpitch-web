import { auth0 } from '@/lib/auth0';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.SQUADPITCH_API_URL || 'http://localhost:4000';

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${API_URL}/api/v1/${path}${request.nextUrl.search}`;

  const session = await auth0.getSession(request);
  const token = session?.tokenSet?.accessToken;

  const headers: Record<string, string> = {};
  const contentType = request.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  if (token) headers['authorization'] = `Bearer ${token}`;

  const body = request.method !== 'GET' && request.method !== 'HEAD'
    ? await request.arrayBuffer()
    : undefined;

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: body ? Buffer.from(body) : undefined,
  });

  const responseBody = await res.arrayBuffer();
  return new NextResponse(responseBody, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') || 'application/json',
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
