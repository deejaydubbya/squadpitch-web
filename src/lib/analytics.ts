// Lightweight analytics wrapper — fires PostHog events when a key is
// configured, no-ops otherwise. The shape exists so callers can add
// `track('publish_succeeded', { channel: 'INSTAGRAM' })` everywhere
// without conditional checks.
//
// Security / privacy posture:
//   - We pass ONLY the event name and a small allow-listed property
//     bag through to PostHog. Callers should never include post body,
//     captions, listing data, OAuth tokens, emails, or phone numbers.
//   - The wrapper validates property values are primitives + small
//     strings before sending. A defensive double-check.
//
// Env:
//   NEXT_PUBLIC_POSTHOG_KEY   — required to enable
//   NEXT_PUBLIC_POSTHOG_HOST  — optional, defaults to https://us.i.posthog.com

const KEY =
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '' : '';
const HOST =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
    : 'https://us.i.posthog.com';

// The allowed funnel events. Adding a new one requires updating this
// union AND documenting it in PRE_BETA_HARDENING_RESULTS.md.
export type AnalyticsEvent =
  | 'landing_cta_clicked'
  | 'demo_played'
  | 'signup_started'
  | 'onboarding_phase_entered'
  | 'workspace_created'
  | 'campaign_generated'
  | 'draft_approved'
  | 'publish_attempted'
  | 'publish_succeeded'
  | 'publish_failed'
  | 'usage_limit_hit'
  | 'upgrade_clicked'
  | 'checkout_started'
  | 'checkout_completed';

type SafePrimitive = string | number | boolean | null;
type Properties = Record<string, SafePrimitive>;

// Property keys we will NEVER forward, even if a caller supplies them.
const FORBIDDEN_KEYS = new Set([
  'email',
  'phone',
  'phoneNumber',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'apiSecret',
  'clientSecret',
  'secret',
  'password',
  'body',
  'caption',
  'description',
  'listing',
  'address',
]);

interface PostHogShape {
  init: (key: string, opts: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
}

let posthog: PostHogShape | null = null;
let initStarted = false;

export async function initAnalytics(): Promise<boolean> {
  if (initStarted) return Boolean(posthog);
  initStarted = true;
  if (!KEY) return false;
  if (typeof window === 'undefined') return false;

  try {
    // Dynamic import keeps PostHog out of the SSR bundle. We
    // intentionally let the bundler resolve this — `posthog-js` is a
    // first-party dep and webpackIgnore would force the browser to do a
    // bare-specifier import that 404s in production.
    const mod = await import('posthog-js');
    const ph: PostHogShape = mod.default ?? mod;
    ph.init(KEY, {
      api_host: HOST,
      person_profiles: 'identified_only',
      capture_pageview: false, // we do this manually on key events
      autocapture: false,
    });
    posthog = ph;
    return true;
  } catch {
    return false;
  }
}

/** Validate / scrub a properties object before sending. */
function sanitiseProps(props: Properties | undefined): Record<string, SafePrimitive> {
  if (!props) return {};
  const out: Record<string, SafePrimitive> = {};
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (
      value === null ||
      typeof value === 'boolean' ||
      typeof value === 'number'
    ) {
      out[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      // Cap string length to keep payloads small + prevent accidental
      // body inclusion via a generic key like "context".
      out[key] = value.length > 200 ? `${value.slice(0, 197)}...` : value;
      continue;
    }
    // Anything else (object, array, function, undefined) is dropped.
  }
  return out;
}

/**
 * Fire a funnel event. Safe to call before init — it'll no-op until
 * `initAnalytics()` resolves and `NEXT_PUBLIC_POSTHOG_KEY` is set.
 */
export function track(event: AnalyticsEvent, props?: Properties): void {
  if (!posthog) return;
  try {
    posthog.capture(event, sanitiseProps(props));
  } catch {
    // Never let analytics break a UI path.
  }
}

export function trackActivation(event: string, props?: Properties): void {
  if (!posthog || !/^[a-z][a-z0-9_]{2,80}$/.test(event)) return;
  try {
    posthog.capture(`activation.v1.${event}`, sanitiseProps(props));
  } catch {
    // Never let analytics break a UI path.
  }
}

/** Identify the current user. We pass only the Auth0 sub. */
export function identify(userSub: string): void {
  if (!posthog || !userSub) return;
  try {
    posthog.identify(userSub);
  } catch {
    // ignore
  }
}

/** Reset on logout. */
export function resetAnalytics(): void {
  if (!posthog) return;
  try {
    posthog.reset();
  } catch {
    // ignore
  }
}

/** Test-only. */
export function _resetAnalyticsForTest(): void {
  posthog = null;
  initStarted = false;
}
