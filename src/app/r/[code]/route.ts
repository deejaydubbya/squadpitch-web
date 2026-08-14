import { NextRequest, NextResponse } from 'next/server';
import { appBaseUrl, squadpitchApiUrl } from '@/lib/serverRuntimeConfig';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const response = await fetch(`${squadpitchApiUrl()}/api/public/referrals/${encodeURIComponent(code)}/capture`, { method: 'POST', cache: 'no-store' });
  if (!response.ok) return NextResponse.redirect(new URL('/?referral=invalid', appBaseUrl()));
  const capture = await response.json() as { token: string };
  const redirect = NextResponse.redirect(new URL('/auth/signup?returnTo=/referrals', appBaseUrl()));
  redirect.cookies.set('sp_referral_capture', capture.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 });
  return redirect;
}
