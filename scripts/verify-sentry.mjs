import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (!dsn) {
  console.error('Sentry is not configured. Set SENTRY_DSN for this operator command.');
  process.exit(2);
}

Sentry.init({
  dsn,
  environment: process.env.SENTRY_ENVIRONMENT || 'production',
  release: process.env.SENTRY_RELEASE || process.env.FLY_IMAGE_REF,
  tracesSampleRate: 0,
  sendDefaultPii: false,
});
const eventId = Sentry.captureException(new Error('Squadpitch Web production-readiness verification'), {
  tags: { synthetic: 'true', source: 'production-readiness', service: 'squadpitch-web' },
});
const delivered = await Sentry.flush(5000);
console.log(`Synthetic Sentry event ${delivered ? 'submitted' : 'timed out'}; event ID: ${eventId}`);
process.exit(delivered ? 0 : 1);
