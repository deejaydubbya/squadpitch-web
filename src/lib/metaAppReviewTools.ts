// Meta App Review dev tools toggle — TEMPORARY.
//
// Distinct from `metaAppReviewDemo.ts`:
//   - DEMO flag (NEXT_PUBLIC_META_APP_REVIEW_DEMO) controls
//     reviewer-facing seeded UI.
//   - TOOLS flag (NEXT_PUBLIC_META_APP_REVIEW_TOOLS) controls
//     dev/admin-facing diagnostic tooling: the "Run Meta App Review
//     API checks" button. It exists so non-admin developers (e.g. on
//     a temporary review session) can invoke the diagnostic without
//     being granted the admin/developer role.
//
// Like the demo flag, NEXT_PUBLIC_* is inlined at build time, so
// flipping requires a rebuild — that's intentional for a dev-only
// gate.
//
// Remove this file (and its callers) when the App Review tool is
// retired.

export function isMetaAppReviewToolsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_META_APP_REVIEW_TOOLS === 'true';
}
