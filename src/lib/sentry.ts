// Optional Sentry client integration for the web app.
//
// Activated only if NEXT_PUBLIC_SENTRY_DSN is set. The actual Sentry SDK
// is dynamically imported, so the dependency is opt-in — local dev
// without `npm install @sentry/browser` does not crash.
//
// Used by:
//   - SentryErrorListener mounted in the app shell
//   - global-error.tsx (forwards Next.js render-time errors)

let initialized = false;
let initStarted = false;

interface SentryShape {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
}
let sentry: SentryShape | null = null;

const dsn =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_SENTRY_DSN ?? ''
    : '';
const environment =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
      process.env.NODE_ENV ??
      'production'
    : 'production';

export async function initWebSentry(): Promise<boolean> {
  if (initStarted) return initialized;
  initStarted = true;

  if (!dsn) {
    return false;
  }

  try {
    // @sentry/browser is a first-party package.json dep; the bundler
    // should resolve it. Using webpackIgnore here would force the
    // browser to evaluate a bare specifier ("@sentry/browser") that
    // does not exist over HTTP, so initialization always failed silently.
    const mod = await import('@sentry/browser');
    const Sentry: SentryShape = mod as unknown as SentryShape;
    Sentry.init({
      dsn,
      environment,
      tracesSampleRate: 0.05,
    });
    sentry = Sentry;
    initialized = true;
    return true;
  } catch (err) {
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[SENTRY] Web init skipped:', (err as Error)?.message);
    }
    return false;
  }
}

export function captureWebException(err: unknown, ctx?: Record<string, unknown>) {
  if (!sentry) return;
  try {
    sentry.captureException(err, ctx ? { extra: ctx } : undefined);
  } catch {
    // never crash a UI path because of telemetry
  }
}

/** Test-only. */
export function _resetWebSentry() {
  sentry = null;
  initialized = false;
  initStarted = false;
}
