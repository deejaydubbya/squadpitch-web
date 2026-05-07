import { describe, it, expect } from 'vitest';
import { interpretPublishError } from './publishErrorMessage';

const channel = 'INSTAGRAM';
const clientId = 'ws-1';
const settingsHref = `/workspaces/${clientId}/settings/channels`;

describe('interpretPublishError', () => {
  it('returns null when there is no error', () => {
    expect(
      interpretPublishError({ publishError: null, channel, clientId })
    ).toBeNull();
    expect(
      interpretPublishError({ publishError: '', channel, clientId })
    ).toBeNull();
  });

  it('CHANNEL_NOT_CONNECTED → friendly message + reconnect action', () => {
    const result = interpretPublishError({
      publishError: 'INSTAGRAM is not connected for this workspace.',
      channel,
      clientId,
    });
    expect(result).not.toBeNull();
    expect(result!.message).toContain("Instagram isn't connected");
    expect(result!.actions[0]).toMatchObject({
      kind: 'reconnect',
      href: settingsHref,
    });
  });

  it('TOKEN_EXPIRED → reconnect prompt that says "expired"', () => {
    const result = interpretPublishError({
      publishError: 'Instagram access has expired. Reconnect the channel to publish.',
      channel,
      clientId,
    });
    expect(result!.message).toContain('expired');
    expect(result!.actions.some((a) => a.kind === 'reconnect')).toBe(true);
  });

  it('PROVIDER_AUTH_FAILED → reconnect action', () => {
    const result = interpretPublishError({
      publishError: 'Unauthorized: token revoked upstream',
      channel,
      clientId,
    });
    expect(result!.actions[0].kind).toBe('reconnect');
  });

  it('RATE_LIMITED → retry action', () => {
    const result = interpretPublishError({
      publishError: 'rate limit exceeded',
      channel,
      clientId,
    });
    expect(result!.actions[0]).toMatchObject({ kind: 'retry' });
    expect(result!.message).toMatch(/rate-limit/i);
  });

  it('PROVIDER_TIMEOUT → retry action', () => {
    const result = interpretPublishError({
      publishError: 'INSTAGRAM publish timed out after 45000ms',
      channel,
      clientId,
    });
    expect(result!.actions[0]).toMatchObject({ kind: 'retry' });
    expect(result!.message).toMatch(/took too long/i);
  });

  it('VALIDATION_FAILED → edit + retry', () => {
    const result = interpretPublishError({
      publishError: 'caption is invalid: too long for instagram',
      channel,
      clientId,
    });
    const kinds = result!.actions.map((a) => a.kind);
    expect(kinds).toContain('edit');
    expect(kinds).toContain('retry');
  });

  it('Unknown error → generic retry + contact support, no raw text leak', () => {
    const raw = 'ECONNRESET at line 42 of mystery.js';
    const result = interpretPublishError({
      publishError: raw,
      channel,
      clientId,
    });
    expect(result).not.toBeNull();
    // Must NOT echo the raw stacktrace-like text verbatim.
    expect(result!.message).not.toContain('ECONNRESET');
    expect(result!.detail ?? '').not.toContain('ECONNRESET');
    const kinds = result!.actions.map((a) => a.kind);
    expect(kinds).toContain('retry');
    expect(kinds).toContain('contact_support');
  });
});
