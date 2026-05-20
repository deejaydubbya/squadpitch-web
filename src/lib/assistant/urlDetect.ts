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

const URL_TOKEN_RE = /\b(?:https?:\/\/|www\.)[^\s<>"]+/i;

export function looksLikeUrl(input: string | null | undefined): boolean {
  if (!input) return false;
  const trimmed = String(input).trim();
  if (trimmed.length === 0) return false;
  return URL_TOKEN_RE.test(trimmed);
}

// Extract the first URL-shaped token from the input. Returns the
// raw substring; the caller should normalize/validate (e.g. add
// `https://` to `www.` URLs) before sending to the backend.
export function extractFirstUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const match = String(input).match(URL_TOKEN_RE);
  if (!match) return null;
  let url = match[0];
  // Drop common trailing punctuation that wasn't part of the URL.
  url = url.replace(/[),.;!?]+$/, '');
  // www.* gets the protocol added so apiFetch / the URL parser
  // accept it.
  if (/^www\./i.test(url)) url = `https://${url}`;
  return url;
}
