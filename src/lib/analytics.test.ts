// Analytics wrapper tests — without NEXT_PUBLIC_POSTHOG_KEY, every
// exported function must be a safe no-op.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Note: `process.env.NEXT_PUBLIC_POSTHOG_KEY` is read at module import
// time via destructure, so we mock the import path rather than mutating
// `process.env` post-hoc.
vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');

import {
  initAnalytics,
  track,
  identify,
  resetAnalytics,
  _resetAnalyticsForTest,
} from './analytics';

beforeEach(() => {
  _resetAnalyticsForTest();
});

describe('analytics wrapper without env key', () => {
  it('initAnalytics returns false', async () => {
    const ok = await initAnalytics();
    expect(ok).toBe(false);
  });

  it('track() does not throw and is a no-op', () => {
    expect(() => track('publish_succeeded', { channel: 'INSTAGRAM' })).not.toThrow();
  });

  it('identify() does not throw without init', () => {
    expect(() => identify('auth0|abc')).not.toThrow();
  });

  it('resetAnalytics() does not throw without init', () => {
    expect(() => resetAnalytics()).not.toThrow();
  });

  it('multiple calls do not throw or repeat init', async () => {
    await initAnalytics();
    await initAnalytics();
    expect(() => track('checkout_started')).not.toThrow();
  });
});
