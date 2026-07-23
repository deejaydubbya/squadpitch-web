// URL-02 — shared URL detection helper.
//
// Used by:
//   - parseCreateRouteParams: when prompt looks like a URL, treat
//     the legacy `sourceType=idea&prompt=<url>` link as a URL
//     source so old dashboard deep-links keep routing right.
//   - parseUserInput (assistant): when the user pastes a URL into
//     the chat, route to URL source instead of treating it as a
//     freeform idea.
//
// Intentionally conservative — we only want to detect input that
// is OBVIOUSLY a URL. Mentions like "look at https://… that page"
// are still URLs and worth catching, so we look for any
// http://, https://, or bare www.* token in the first ~200 chars.
// The full input is allowed to be longer (some users paste a URL
// + a note) — we extract the first URL.

const URL_TOKEN_RE =
  /\b(?:(?:https?:\/\/|www\.)[^\s<>"]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:\/[^\s<>"]*)?)/gi;

export function looksLikeUrl(input: string | null | undefined): boolean {
  return extractFirstUrl(input) !== null;
}

// Extract the first URL-shaped token from the input. Returns the
// raw substring; the caller should normalize/validate (e.g. add
// `https://` to `www.` URLs) before sending to the backend.
export function extractFirstUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = String(input);
  URL_TOKEN_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = URL_TOKEN_RE.exec(value)) !== null) {
    const previousChar = match.index > 0 ? value[match.index - 1] : '';
    if (previousChar === '@') continue;

    let url = match[0];
    // Drop common trailing punctuation that wasn't part of the URL.
    url = url.replace(/[),.;!?]+$/, '');
    // www.* and bare domains get the protocol added so apiFetch /
    // the URL parser accept them.
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    return url;
  }

  return null;
}

// URL-03 — shared route builder for the dashboard quick-input.
//
// Decides between the URL-intake flow and the idea flow based on
// `extractFirstUrl`, then returns the assistant `/create` URL
// ready for `router.push`. Pure function so the dashboard
// CampaignInput can stay thin and the routing logic is testable
// without a router or React.
//
// `base` is the workspace-scoped prefix (e.g.
// `/workspaces/cm123…`). The caller never has to remember which
// query keys to use — and the FE can change source-type slugs
// later without touching every entry point.
export function buildCampaignRouteFromInput(
  base: string,
  rawInput: string,
): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;
  const url = extractFirstUrl(trimmed);
  if (url) {
    return `${base}/create?intent=campaign&sourceType=url&sourceUrl=${encodeURIComponent(url)}`;
  }
  return `${base}/create?intent=campaign&sourceType=idea&prompt=${encodeURIComponent(trimmed)}`;
}
