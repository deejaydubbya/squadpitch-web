// Onboarding-persistence unit tests.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveOnboardingSession,
  loadOnboardingSession,
  clearOnboardingSession,
  STORAGE_VERSION,
  _STORAGE_KEY,
} from './persistence';

// Simple in-memory localStorage stub.
function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => void data.clear(),
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    get length() {
      return data.size;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: createMemoryStorage() });
});

const sampleState: any = {
  phase: 'analysis',
  industryKey: 'real_estate',
  starterMethod: 'listing',
  primaryInput: 'https://example.com/listing',
  sources: [],
  analyzeResult: null,
  createdClientId: null,
  previewDrafts: [],
  sourceEntries: [],
  enrichmentsCompleted: [],
  enrichmentsSkipped: false,
  brandConfirmed: false,
  profilesSaved: false,
  brandNameOverride: null,
  error: null,
  fallbackIntent: null,
  fallbackSourceMethod: null,
  contentPrompt: null,
  profileRefinementDone: false,
  reIntent: null,
  reListingSource: null,
  reContentGoal: null,
  reAgentProfileDone: false,
  selectedPropertyIds: null,
  propertyReviewDone: false,
  photoOfferResult: null,
  pendingEnrichment: null,
  channelConnectDone: false,
  channelConnectSkipped: false,
  connectedChannelsSnapshot: [],
};

describe('onboarding persistence', () => {
  it('persists across simulated unmount/remount', () => {
    saveOnboardingSession(sampleState);
    const loaded = loadOnboardingSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.phase).toBe('analysis');
    expect(loaded?.industryKey).toBe('real_estate');
  });

  it('does not persist the initial empty state', () => {
    const empty = { ...sampleState, phase: 'industry_select', industryKey: null };
    saveOnboardingSession(empty);
    expect(loadOnboardingSession()).toBeNull();
  });

  it('ignores a payload with a stale schema version', () => {
    window.localStorage.setItem(
      _STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION + 99, savedAt: Date.now(), state: sampleState })
    );
    expect(loadOnboardingSession()).toBeNull();
  });

  it('ignores a payload older than the max-age window', () => {
    const old = JSON.stringify({
      version: STORAGE_VERSION,
      savedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      state: sampleState,
    });
    window.localStorage.setItem(_STORAGE_KEY, old);
    expect(loadOnboardingSession()).toBeNull();
  });

  it('ignores malformed JSON', () => {
    window.localStorage.setItem(_STORAGE_KEY, '{not json');
    expect(loadOnboardingSession()).toBeNull();
  });

  it('clearOnboardingSession() removes the stored state', () => {
    saveOnboardingSession(sampleState);
    clearOnboardingSession();
    expect(loadOnboardingSession()).toBeNull();
  });
});
