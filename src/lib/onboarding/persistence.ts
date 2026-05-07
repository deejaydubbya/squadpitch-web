// localStorage persistence for the onboarding wizard.
//
// We persist the *session* reducer state (industry, intent, primary
// input, analyze result, created client id, preview drafts, etc.) — NOT
// the chat conversation. The conversation is rebuildable from the
// session phase; serialising it would bloat localStorage and make
// schema migrations painful.
//
// Keying:
//   sp_onboarding_session_v1
// Bumping `STORAGE_VERSION` invalidates older payloads on rehydrate so
// we never feed a half-broken shape into the reducer after a refactor.

import type { OnboardingSessionState } from './types';

export const STORAGE_VERSION = 1;
const STORAGE_KEY = `sp_onboarding_session_v${STORAGE_VERSION}`;
// 7 days — onboarding shouldn't take longer than that. After this we
// drop the saved state on next mount.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface PersistedEnvelope {
  version: number;
  savedAt: number; // unix ms
  state: OnboardingSessionState;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Save the session. Best-effort — never throws. */
export function saveOnboardingSession(state: OnboardingSessionState): void {
  if (!isBrowser()) return;
  try {
    // Don't persist the cleared state; that's just noise.
    if (state.phase === 'industry_select' && !state.industryKey) return;
    const envelope: PersistedEnvelope = {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      state,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // localStorage unavailable / quota / serialization error — ignore.
  }
}

/**
 * Load the saved session if present, valid, and not expired. Returns
 * `null` for any reason it can't safely rehydrate.
 */
export function loadOnboardingSession(): OnboardingSessionState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedEnvelope;
    if (!parsed || parsed.version !== STORAGE_VERSION) {
      // Different schema — drop it.
      clearOnboardingSession();
      return null;
    }
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearOnboardingSession();
      return null;
    }
    if (!parsed.state || typeof parsed.state !== 'object' || !parsed.state.phase) {
      clearOnboardingSession();
      return null;
    }
    return parsed.state;
  } catch {
    // Malformed JSON / serialisation drift — drop it.
    clearOnboardingSession();
    return null;
  }
}

/** Drop the saved session. Used on completion + Start Over. */
export function clearOnboardingSession(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Test-only helper: the storage key in use. */
export const _STORAGE_KEY = STORAGE_KEY;
