import { NextResponse } from 'next/server';
import { squadpitchApiUrl } from '@/lib/serverRuntimeConfig';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return NextResponse.redirect(new URL('/', squadpitchApiUrl()), 302);
  const response = await fetch(`${squadpitchApiUrl()}/api/v1/public/outreach/track/click/${encodeURIComponent(token)}`, { cache: 'no-store', redirect: 'manual' }).catch(() => null);
  const destination = response?.headers.get('location');
  return NextResponse.redirect(destination ? new URL(destination, squadpitchApiUrl()) : new URL('/', squadpitchApiUrl()), 302);
}
