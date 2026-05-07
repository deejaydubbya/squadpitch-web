import { describe, it, expect } from 'vitest';
import { shouldRedirectToOnboarding } from './onboardingRedirect';

describe('shouldRedirectToOnboarding', () => {
  it('returns false while clients are still loading', () => {
    expect(
      shouldRedirectToOnboarding({ isLoading: true, error: null, clients: undefined })
    ).toBe(false);
  });

  it('returns false when the clients query errored', () => {
    expect(
      shouldRedirectToOnboarding({
        isLoading: false,
        error: new Error('boom'),
        clients: undefined,
      })
    ).toBe(false);
  });

  it('returns false if clients is undefined or null', () => {
    expect(
      shouldRedirectToOnboarding({ isLoading: false, error: null, clients: undefined })
    ).toBe(false);
    expect(
      shouldRedirectToOnboarding({ isLoading: false, error: null, clients: null })
    ).toBe(false);
  });

  it('returns true when clients loaded successfully and the user has zero workspaces', () => {
    expect(
      shouldRedirectToOnboarding({ isLoading: false, error: null, clients: [] })
    ).toBe(true);
  });

  it('returns false when the user already has at least one workspace', () => {
    expect(
      shouldRedirectToOnboarding({
        isLoading: false,
        error: null,
        clients: [{ id: 'ws-1' }],
      })
    ).toBe(false);
    expect(
      shouldRedirectToOnboarding({
        isLoading: false,
        error: null,
        clients: [{ id: 'ws-1' }, { id: 'ws-2' }],
      })
    ).toBe(false);
  });
});
