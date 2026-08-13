import { NextRequest, NextResponse } from 'next/server';
import { squadpitchApiUrl } from '@/lib/serverRuntimeConfig';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ kind: string; token: string }> }) {
  const { kind, token } = await params;
  if (kind !== 'preview' || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  const response = await fetch(`${squadpitchApiUrl()}/api/v1/public/prospect-previews/${encodeURIComponent(token)}`, { cache: 'no-store' });
  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' },
  });
}
