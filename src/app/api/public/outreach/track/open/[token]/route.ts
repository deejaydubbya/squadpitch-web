import { NextResponse } from 'next/server';
import { squadpitchApiUrl } from '@/lib/serverRuntimeConfig';

const FALLBACK_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = raw.endsWith('.gif') ? raw.slice(0, -4) : raw;
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return new NextResponse(FALLBACK_PIXEL, { status: 200, headers: { 'content-type': 'image/gif', 'cache-control': 'no-store' } });
  const response = await fetch(`${squadpitchApiUrl()}/api/v1/public/outreach/track/open/${encodeURIComponent(token)}.gif`, { cache: 'no-store' }).catch(() => null);
  return new NextResponse(response ? await response.arrayBuffer() : FALLBACK_PIXEL, { status: 200, headers: { 'content-type': 'image/gif', 'cache-control': 'no-store' } });
}
