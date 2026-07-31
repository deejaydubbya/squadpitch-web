import * as Sentry from '@sentry/nextjs';
import { redactSentryEvent } from './src/lib/sentryPrivacy';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE ?? process.env.FLY_IMAGE_REF,
  tracesSampleRate: 0.02,
  sendDefaultPii: false,
  beforeSend: redactSentryEvent,
});
