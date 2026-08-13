import { NextRequest, NextResponse } from 'next/server';
import { squadpitchApiUrl } from '@/lib/serverRuntimeConfig';

export async function POST(request: NextRequest) {
  const claimToken = (await request.json().catch(() => null))?.claimToken;
  if (typeof claimToken !== 'string' || !/^[A-Za-z0-9_-]{40,100}$/.test(claimToken)) return NextResponse.json({ valid: false });
  const response = await fetch(`${squadpitchApiUrl()}/api/v1/public/prospect-claims/inspect`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claimToken }), cache: 'no-store' });
  return new NextResponse(await response.arrayBuffer(), { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });
}
