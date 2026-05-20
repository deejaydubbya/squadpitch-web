export interface CopyComplianceFinding {
  variantIndex?: number;
  field?: string;
  phrase?: string;
  reason?: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  // Ads-09 — when the API returns READY_PRECONDITIONS_FAILED or
  // COMPLIANCE_COPY_REVIEW_FAILED, the body carries an array of
  // human-readable items the user has to fix. Forwarded verbatim
  // so the FE can render a checklist instead of just the flat
  // top-level message.
  missing?: string[];
  findings?: CopyComplianceFinding[];

  constructor(
    message: string,
    status: number,
    code: string,
    extras: { missing?: string[]; findings?: CopyComplianceFinding[] } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (extras.missing) this.missing = extras.missing;
    if (extras.findings) this.findings = extras.findings;
  }
}

// In-flight guard so concurrent failed requests don't each trigger a
// separate redirect (would lose the returnTo and feel buggy).
let sessionExpiredRedirecting = false;

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `/api/proxy/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.message || body?.error || `API error ${res.status}`;
    const code = body?.code || `HTTP_${res.status}`;
    // Ads-09 — forward checklist-style fields (READY validator's
    // missing[] and copy linter's findings[]) so callers can
    // render an actionable fix-list, not just the headline.
    const extras: { missing?: string[]; findings?: CopyComplianceFinding[] } = {};
    if (Array.isArray(body?.missing)) extras.missing = body.missing;
    if (Array.isArray(body?.findings)) extras.findings = body.findings;

    // Session expired: the proxy couldn't produce a fresh access token
    // (refresh token missing, revoked, or Auth0 refresh failed). Send
    // the user back to the landing page so they can log in again.
    // returnTo lets us bring them back to where they were after login.
    if (res.status === 401 && code === 'SESSION_EXPIRED' && typeof window !== 'undefined') {
      if (!sessionExpiredRedirecting) {
        sessionExpiredRedirecting = true;
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/?session_expired=1&returnTo=${returnTo}`;
      }
      // Throw anyway so awaiting callers don't try to render a result.
      throw new ApiError(msg, res.status, code, extras);
    }

    throw new ApiError(msg, res.status, code, extras);
  }

  return res.json();
}
