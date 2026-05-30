// Instagram Login / Business Login scope helpers (IG-04).
//
// The Instagram channel migrated from Facebook-Login-via-Page (old
// Meta App Review request) to direct Instagram Login / Business
// Login. The two scope families don't overlap by name, so we use
// this module to detect legacy connections that still need to be
// reconnected before publishing/insights/comments will work.
//
// Keep in sync with squadpitch-api/domains/studio/oauth/instagram.oauth.js
// (INSTAGRAM_SCOPES) and providerCapabilities.js (INSTAGRAM.currentScopes).

export const INSTAGRAM_BUSINESS_LOGIN_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
  'instagram_business_manage_comments',
] as const;

/** Plain-English explanation of what each scope unlocks — shown in
 *  the connection card description so reviewers + users can see
 *  exactly why each permission is requested. */
export const INSTAGRAM_SCOPE_EXPLANATIONS: Record<
  (typeof INSTAGRAM_BUSINESS_LOGIN_SCOPES)[number],
  string
> = {
  instagram_business_basic:
    'identify the connected Instagram professional account',
  instagram_business_content_publish:
    'publish approved posts, Reels, and other media',
  instagram_business_manage_insights:
    'sync account and media analytics',
  instagram_business_manage_comments:
    'monitor and reply to public comments',
};

/** Any scope in this set indicates a pre-IG-04 connection that
 *  predates the Business Login migration. Presence of even one
 *  legacy scope ⇒ the connection needs to be re-OAuthed. */
const LEGACY_INSTAGRAM_SCOPES = new Set([
  // Old Facebook-Login-via-Page scope set we used before Prompt 01.
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'instagram_manage_comments',
  // Facebook Page scopes that the OLD Instagram OAuth flow piggybacked
  // on. These still live on the FACEBOOK channel; their presence on
  // an INSTAGRAM connection means the user authorized the
  // pre-migration scope set.
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
]);

/**
 * Returns true if an existing Instagram connection still carries
 * the old scope shape and needs to be reconnected for the new
 * Business Login flow.
 *
 * Detection rule: ANY legacy scope present OR ANY of the four
 * new Business Login scopes missing.
 *
 * Safe for unknown / empty inputs — returns `false` (no false
 * positives when the API hasn't reported scopes yet).
 */
export function instagramConnectionNeedsReconnect(
  scopes: readonly string[] | null | undefined,
): boolean {
  if (!Array.isArray(scopes) || scopes.length === 0) return false;
  for (const s of scopes) {
    if (LEGACY_INSTAGRAM_SCOPES.has(s)) return true;
  }
  const granted = new Set(scopes);
  for (const required of INSTAGRAM_BUSINESS_LOGIN_SCOPES) {
    if (!granted.has(required)) return true;
  }
  return false;
}

/** Connection-card description string used as the "what does this
 *  do?" copy before the user has connected Instagram. Includes the
 *  four scope explanations from the spec. */
export const INSTAGRAM_CONNECTION_DESCRIPTION =
  'Connect your Instagram Business or Creator account directly with Instagram Login. We request four permissions: '
  + INSTAGRAM_BUSINESS_LOGIN_SCOPES.map(
    (s) => `${s} (${INSTAGRAM_SCOPE_EXPLANATIONS[s]})`,
  ).join(', ')
  + '.';

/** Banner copy shown when an existing Instagram connection still
 *  carries the legacy Facebook-Login-via-Page scope shape. */
export const INSTAGRAM_RECONNECT_BANNER =
  'Instagram changed to direct Instagram Login. Please reconnect Instagram to grant the new Business permissions.';
