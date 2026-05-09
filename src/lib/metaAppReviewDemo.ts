// Meta App Review demo mode toggle.
//
// When enabled, the analytics UI surfaces a clearly-labeled
// "demo / reviewer" experience: a banner explaining that the data
// shown is seeded test data, a connected-account card showing the
// fake Facebook Page + Instagram professional account, and per-post
// "Source: Meta test data" labels in the detail modal.
//
// The flag is a public Next.js env var so the web bundle can branch
// on it without an extra round-trip:
//   NEXT_PUBLIC_META_APP_REVIEW_DEMO=true
//
// Important: this is purely presentational. The underlying data is
// already real (read from Postgres via the same analytics API),
// produced by the seed-analytics script's --meta-demo flag. No
// runtime mocking happens here — turning this off simply hides the
// demo banner / connected-account card; existing analytics
// behavior is unchanged.
//
// To turn it off in production: unset the env var (or set to
// anything other than "true") and redeploy the web app.

export const META_APP_REVIEW_DEMO_LABELS = {
  facebookPageName: 'Squadpitch Test Page',
  instagramHandle: '@squadpitchtest',
  instagramAccountId: '17841444444444444',
  facebookPageId: '100000000000001',
  source: 'Meta test data for App Review',
  bannerTitle: 'Demo analytics for Meta App Review',
  bannerBody:
    'Metrics shown on this workspace are seeded demo data used to demonstrate the Meta-connected analytics workflow during Squadpitch’s App Review. Production workspaces fetch live insights from Meta’s Graph API.',
} as const;

export function isMetaAppReviewDemo(): boolean {
  // Read at call time. Next.js inlines NEXT_PUBLIC_* at build time,
  // so toggling requires a rebuild — that's the desired behavior
  // for a guarded demo flag.
  return process.env.NEXT_PUBLIC_META_APP_REVIEW_DEMO === 'true';
}
