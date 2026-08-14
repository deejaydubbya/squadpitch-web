import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { squadpitchApiUrl } from '@/lib/serverRuntimeConfig';

export async function POST(request: NextRequest) {
  const captureToken = request.cookies.get('sp_referral_capture')?.value;
  if (!captureToken) return NextResponse.json({ attached: false, reason: 'none' });
  const session = await auth0.getSession(request);
  const accessToken = (session as { tokenSet?: { accessToken?: string } } | null)?.tokenSet?.accessToken;
  if (!accessToken) return NextResponse.json({ attached: false, reason: 'unauthenticated' }, { status: 401 });
  const upstream = await fetch(`${squadpitchApiUrl()}/api/v1/referrals/attribution`, { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ captureToken }), cache: 'no-store' });
  const body = await upstream.arrayBuffer();
  const response = new NextResponse(body, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') || 'application/json', 'cache-control': 'private, no-store' } });
  if (upstream.ok || [400, 403, 409, 410].includes(upstream.status)) response.cookies.delete('sp_referral_capture');
  return response;
}
