import { NextRequest, NextResponse } from 'next/server';
import { squadpitchApiUrl } from '@/lib/serverRuntimeConfig';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return new NextResponse(null, { status: 204 });
  await fetch(`${squadpitchApiUrl()}/api/v1/public/outreach/track/claim-start/${encodeURIComponent(token)}`, { method: 'POST', cache: 'no-store' }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
