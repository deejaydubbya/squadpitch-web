// industry-02 — command-bar chips for the campaignType step must
// not include real-estate-specific labels (Just Listed / Open
// House / Price Drop / Listing Spotlight) for no-industry or
// non-real-estate workspaces.

import { describe, it, expect } from 'vitest';
import { getContextualChips } from './commandBar';
import { INITIAL_SESSION } from '../defaults';
import type { AssistantSessionState } from '../types';

function session(overrides: Partial<AssistantSessionState>): AssistantSessionState {
  return {
    ...INITIAL_SESSION,
    mode: 'campaign',
    // We need a campaign-type step (mode + source picked, type
    // missing) so the chip-builder takes the campaignType branch.
    campaignType: null,
    ...overrides,
  };
}

const RE_CHIPS = ['Just Listed', 'Open House', 'Price Drop', 'Listing Spotlight'];

describe('commandBar — campaignType chips industry safety', () => {
  it("returns real-estate chips when source=property AND industry=real_estate", () => {
    const s = session({
      campaignSourceType: 'property',
      industryKey: 'real_estate',
      // Source has to be picked + complete so the resolver lands
      // on the campaignType step.
      selectedPropertyId: 'p1',
      propertyData: { id: 'p1' },
    });
    const chips = getContextualChips(s, false, false);
    const labels = chips.map((c) => c.label);
    for (const re of RE_CHIPS) {
      expect(labels).toContain(re);
    }
  });

  it("does NOT return real-estate chips when industryKey is null (even if source=property)", () => {
    const s = session({
      campaignSourceType: 'property',
      industryKey: null,
      selectedPropertyId: 'p1',
      propertyData: { id: 'p1' },
    });
    const chips = getContextualChips(s, false, false);
    const labels = chips.map((c) => c.label);
    for (const re of RE_CHIPS) {
      expect(labels).not.toContain(re);
    }
    // Should get the generic cross-industry set instead.
    expect(labels).toEqual(
      expect.arrayContaining(['Awareness', 'Lead Gen', 'Educational', 'Promotion']),
    );
  });

  it("does NOT return real-estate chips for automotive industry", () => {
    const s = session({
      campaignSourceType: 'property',
      industryKey: 'automotive',
      selectedPropertyId: 'p1',
      propertyData: { id: 'p1' },
    });
    const chips = getContextualChips(s, false, false);
    const labels = chips.map((c) => c.label);
    for (const re of RE_CHIPS) {
      expect(labels).not.toContain(re);
    }
  });

  it("returns generic chips when source is data_item regardless of industry", () => {
    const s = session({
      campaignSourceType: 'data_item',
      industryKey: 'real_estate',
      campaignDataItemId: 'd1',
      campaignDataItemTitle: 'x',
      campaignDataItemType: 'TESTIMONIAL',
      campaignDataItemData: {},
    });
    const chips = getContextualChips(s, false, false);
    const labels = chips.map((c) => c.label);
    for (const re of RE_CHIPS) {
      expect(labels).not.toContain(re);
    }
  });
});
