// Cloudinary media proxy — serves from our verified domain so
// TikTok's PULL_FROM_URL flow accepts the URL.
//
// TikTok requires the host that returns publish media to be a domain
// you've verified in the developer portal. We've verified
// squadpitch.com (and app.squadpitch.com), but res.cloudinary.com
// isn't ours and can't be added. This route exposes a thin allow-
// listed pass-through so TikTok pulls bytes from squadpitch.com while
// the actual asset stays on Cloudinary.
//
// Allow-list policy: only res.cloudinary.com/<our-cloud>/<...> is
// reachable. Any other URL shape returns 400. This blocks the route
// from being used as an open relay.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// Allow up to 5 min of streaming — large videos take time to push.
export const maxDuration = 300;

const CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  'dvayzlhis';

const ALLOWED_CONTENT_TYPE = /^(image|video)\//;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const path = (pathSegments ?? []).join('/');
  if (!path) {
    return NextResponse.json({ error: 'missing path' }, { status: 400 });
  }

  // Reject anything that tries to escape the allow-listed cloud (e.g. via
  // ../ path traversal or absolute URLs in the path segment).
  if (path.includes('..') || /^https?:\/\//i.test(path)) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  const upstream = `https://res.cloudinary.com/${CLOUD_NAME}/${path}`;

  let res: Response;
  try {
    res = await fetch(upstream, {
      headers: {
        // Identify the proxy clearly so Cloudinary access logs are auditable.
        'User-Agent': 'Squadpitch-MediaProxy/1.0',
        Accept: 'image/*,video/*,*/*;q=0.8',
      },
    });
  } catch {
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `upstream ${res.status}` },
      { status: res.status === 404 ? 404 : 502 }
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!ALLOWED_CONTENT_TYPE.test(contentType)) {
    // Don't relay HTML / JSON / arbitrary types — only image / video.
    return NextResponse.json(
      { error: 'unsupported content type' },
      { status: 415 }
    );
  }

  // Stream the body straight back. TikTok's URL verifier follows the
  // headers (Content-Type, Content-Length, etag) so we forward what
  // Cloudinary gives us.
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  const len = res.headers.get('content-length');
  if (len) headers.set('Content-Length', len);
  const etag = res.headers.get('etag');
  if (etag) headers.set('ETag', etag);
  // Short cache so an immediate retry doesn't punch Cloudinary again,
  // but TikTok's verification doesn't get stuck on a stale response.
  headers.set('Cache-Control', 'public, max-age=300');

  return new NextResponse(res.body, { status: 200, headers });
}
