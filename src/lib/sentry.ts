import * as Sentry from '@sentry/nextjs';

export async function initWebSentry(): Promise<boolean> {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function captureWebException(err: unknown, ctx?: Record<string, unknown>) {
  try {
    Sentry.captureException(err, ctx ? { extra: ctx } : undefined);
  } catch {
    // Telemetry must never break a UI path.
  }
}

/** Test-only compatibility helper. SDK state is owned by instrumentation-client. */
export function _resetWebSentry() {}
