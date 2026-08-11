# PWA readiness

## Implemented

- A standards-based web app manifest with the production Squadpitch name,
  colors, standalone display mode, authenticated workspace start URL, and the
  existing production 192 px and 512 px icons.
- Root mobile metadata for theme color, dark color scheme, Apple standalone
  mode, the existing 180 px Apple icon, and disabled automatic telephone-link
  formatting.
- Dynamic viewport and safe-area behavior for installed and mobile-browser
  layouts.
- An accessible connection-status banner. It warns when the browser is offline
  without pretending that authenticated writes can be queued or saved.
- The existing service worker remains push-only. It has no `fetch` listener and
  does not cache pages, API responses, credentials, or tenant data. Notification
  clicks are constrained to same-origin navigation and reuse an existing app
  window when possible.

## Intentionally deferred

- Offline application data and background write queues. These require an
  explicit encrypted, tenant-aware data lifecycle and conflict-resolution
  design; a generic cache-first worker is unsafe for authenticated workspaces.
- A maskable icon and monochrome notification badge. The current production
  asset is declared only as `purpose: any`; design should supply approved assets
  rather than having engineering synthesize branding.
- Custom install-prompt UI. Browser-native installation remains available where
  supported and avoids platform-specific prompt edge cases.
- Background sync, periodic sync, and broader push-notification changes.

## Future native iOS and Android apps

Native apps would need an explicit product and security scope: signed App Store
and Play Store bundles, native navigation and secure credential storage,
universal/app links, platform notification credentials and token lifecycle,
permission UX, background-task policy, deep-link routing, release automation,
store privacy declarations, telemetry/crash reporting, and device-level QA.

## Future web push

The repository already contains a narrow push service worker and subscription
hooks. Expanding web push requires provider/production readiness verification,
permission UX, subscription revocation and device management, payload privacy,
deep-link authorization checks, delivery observability, and cross-browser QA.
