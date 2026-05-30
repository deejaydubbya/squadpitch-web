// URL-02 — input parser URL detection.
//
// Covers the rule that pasted URLs route to the URL source flow
// instead of becoming a generic idea. The full inputParser does a
// lot more (mode detection, channel/objective extraction, etc.);
// this file focuses on the URL-detection branch added in URL-02.

import { describe, it, expect } from 'vitest';
import { parseUserInput } from './inputParser';
import { INITIAL_SESSION } from '../defaults';
import type { AssistantSessionState } from '../types';

function makeSession(overrides: Partial<AssistantSessionState> = {}): AssistantSessionState {
  return {
    ...INITIAL_SESSION,
    mode: 'campaign',
    ...overrides,
  };
}

describe('parseUserInput — URL detection (URL-02)', () => {
  it('routes a pasted https URL to URL source, not idea', () => {
    const res = parseUserInput(
      'https://www.zillow.com/homedetails/12345',
      makeSession(),
    );
    expect(res.actions).toContainEqual({
      type: 'SET_CAMPAIGN_SOURCE_TYPE',
      payload: 'url',
    });
    expect(res.actions).toContainEqual({
      type: 'SET_CAMPAIGN_SOURCE_URL',
      payload: 'https://www.zillow.com/homedetails/12345',
    });
  });

  it('routes a pasted http URL to URL source', () => {
    const res = parseUserInput('http://example.com/listing/abc', makeSession());
    expect(res.actions).toContainEqual({
      type: 'SET_CAMPAIGN_SOURCE_TYPE',
      payload: 'url',
    });
    expect(res.actions).toContainEqual({
      type: 'SET_CAMPAIGN_SOURCE_URL',
      payload: 'http://example.com/listing/abc',
    });
  });

  it("routes 'www.…' bare URLs to URL source (prepends https://)", () => {
    const res = parseUserInput('www.realtor.com/property/xyz', makeSession());
    expect(res.actions).toContainEqual({
      type: 'SET_CAMPAIGN_SOURCE_URL',
      payload: 'https://www.realtor.com/property/xyz',
    });
  });

  it('extracts the FIRST URL when the user pastes a URL + a note', () => {
    const res = parseUserInput(
      'check out https://example.com/listing/1 — looks great',
      makeSession(),
    );
    expect(res.actions).toContainEqual({
      type: 'SET_CAMPAIGN_SOURCE_URL',
      payload: 'https://example.com/listing/1',
    });
  });

  it('does NOT route a plain freeform idea (no URL) to URL source', () => {
    const res = parseUserInput(
      'Promote our new buyer concierge service to first-time buyers',
      makeSession(),
    );
    expect(res.actions).not.toContainEqual(
      expect.objectContaining({ type: 'SET_CAMPAIGN_SOURCE_TYPE', payload: 'url' }),
    );
    expect(res.actions).not.toContainEqual(
      expect.objectContaining({ type: 'SET_CAMPAIGN_SOURCE_URL' }),
    );
  });

  it('does not double-fire SET_CAMPAIGN_SOURCE_TYPE when a URL is present', () => {
    const res = parseUserInput(
      'use this property https://example.com/listing/1',
      makeSession(),
    );
    const sourceTypeActions = res.actions.filter(
      (a) => a.type === 'SET_CAMPAIGN_SOURCE_TYPE',
    );
    expect(sourceTypeActions).toHaveLength(1);
    expect(sourceTypeActions[0]).toEqual({
      type: 'SET_CAMPAIGN_SOURCE_TYPE',
      payload: 'url',
    });
  });

  it('overrides a stale idea source when a URL arrives during revision', () => {
    // Simulate the user previously picked idea, then later pasted a
    // URL. URL detection upgrades them to the URL flow.
    const session = makeSession({ campaignSourceType: 'idea', campaignIdea: 'old idea' });
    const res = parseUserInput('switch to https://example.com/listing/2', session);
    expect(res.actions).toContainEqual({
      type: 'SET_CAMPAIGN_SOURCE_TYPE',
      payload: 'url',
    });
  });

  it("does NOT touch source type when mode isn't campaign yet", () => {
    const session = makeSession({ mode: null });
    const res = parseUserInput('https://example.com/listing/3', session);
    expect(res.actions).not.toContainEqual(
      expect.objectContaining({ type: 'SET_CAMPAIGN_SOURCE_TYPE', payload: 'url' }),
    );
  });
});
