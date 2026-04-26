import { describe, it, expect } from 'vitest';
import { buildOnboardingGenerationPlan, type PlannerInput, type DataItem } from './onboardingPlanner';

// ── Helpers ──────────────────────────────────────────────────────────

function makeListing(id: string, overrides: Record<string, unknown> = {}): DataItem {
  return {
    id,
    dataJson: {
      type: 'listing',
      address: '123 Main St',
      city: 'Austin',
      state: 'TX',
      price: 450000,
      beds: 3,
      baths: 2,
      sqft: 1800,
      ...overrides,
    },
  };
}

function makeInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    coreTemplates: [],
    starterAngles: [],
    dataItems: [],
    connectedChannels: [],
    suggestedChannels: [],
    hasMedia: false,
    industryKey: 'real_estate',
    brandContext: 'Test agent in Austin TX',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('buildOnboardingGenerationPlan', () => {
  it('produces 3 slots for RE with one listing', () => {
    const input = makeInput({
      dataItems: [makeListing('L1')],
    });
    const plan = buildOnboardingGenerationPlan(input);

    expect(plan).toHaveLength(3);

    // Slot 1 should be listing-backed
    expect(plan[0].templateType).toBe('listing_post');
    expect(plan[0].dataItemId).toBe('L1');
    expect(plan[0].contentCategory).toBe('data-backed');

    // Slots should have distinct template types
    const types = plan.map((s) => s.templateType);
    expect(new Set(types).size).toBe(3);
  });

  it('distributes multiple listings across slots', () => {
    const input = makeInput({
      dataItems: [
        makeListing('L1', { address: '100 First Ave' }),
        makeListing('L2', { address: '200 Second St' }),
      ],
    });
    const plan = buildOnboardingGenerationPlan(input);

    expect(plan).toHaveLength(3);

    // First two should use different listing data items
    expect(plan[0].dataItemId).toBe('L1');
    expect(plan[1].dataItemId).toBe('L2');
  });

  it('distributes 3+ listings one per post', () => {
    const input = makeInput({
      dataItems: [
        makeListing('L1'),
        makeListing('L2'),
        makeListing('L3'),
      ],
    });
    const plan = buildOnboardingGenerationPlan(input);

    expect(plan).toHaveLength(3);
    expect(plan[0].dataItemId).toBe('L1');
    expect(plan[1].dataItemId).toBe('L2');
    expect(plan[2].dataItemId).toBe('L3');
  });

  it('produces 3 safe fallback slots for RE with no data', () => {
    const input = makeInput({ dataItems: [] });
    const plan = buildOnboardingGenerationPlan(input);

    expect(plan).toHaveLength(3);
    // All should be fallback category — no data to back them
    plan.forEach((slot) => {
      expect(slot.contentCategory).toBe('fallback');
      expect(slot.dataItemId).toBeNull();
    });

    // Should not contain risky template types
    const types = plan.map((s) => s.templateType);
    expect(types).not.toContain('open_house_post');
    expect(types).not.toContain('price_drop_alert');
    expect(types).not.toContain('client_testimonial');
  });

  it('assigns channels when connected', () => {
    const input = makeInput({
      dataItems: [makeListing('L1')],
      connectedChannels: ['FACEBOOK', 'LINKEDIN'],
    });
    const plan = buildOnboardingGenerationPlan(input);

    // Round-robin across 2 channels
    expect(plan[0].channel).toBe('FACEBOOK');
    expect(plan[1].channel).toBe('LINKEDIN');
    expect(plan[2].channel).toBe('FACEBOOK');
  });

  it('excludes YouTube and TikTok (video-only)', () => {
    const input = makeInput({
      dataItems: [makeListing('L1')],
      connectedChannels: ['YOUTUBE', 'TIKTOK', 'FACEBOOK'],
    });
    const plan = buildOnboardingGenerationPlan(input);

    const channels = plan.map((s) => s.channel);
    expect(channels).not.toContain('YOUTUBE');
    expect(channels).not.toContain('TIKTOK');
    // All should be FACEBOOK (only eligible)
    channels.forEach((ch) => expect(ch).toBe('FACEBOOK'));
  });

  it('excludes Instagram when no media available', () => {
    const input = makeInput({
      dataItems: [makeListing('L1')],
      connectedChannels: ['INSTAGRAM', 'LINKEDIN'],
      hasMedia: false,
    });
    const plan = buildOnboardingGenerationPlan(input);

    const channels = plan.map((s) => s.channel);
    expect(channels).not.toContain('INSTAGRAM');
  });

  it('includes Instagram when media is available', () => {
    const input = makeInput({
      dataItems: [makeListing('L1')],
      connectedChannels: ['INSTAGRAM', 'LINKEDIN'],
      hasMedia: true,
    });
    const plan = buildOnboardingGenerationPlan(input);

    const channels = plan.map((s) => s.channel);
    expect(channels).toContain('INSTAGRAM');
  });

  it('falls back to safe defaults when no channels connected', () => {
    const input = makeInput({
      dataItems: [makeListing('L1')],
      connectedChannels: [],
      suggestedChannels: [],
      hasMedia: false,
    });
    const plan = buildOnboardingGenerationPlan(input);

    // Safe defaults without media: FACEBOOK, LINKEDIN
    const channels = new Set(plan.map((s) => s.channel));
    expect(channels).not.toContain('YOUTUBE');
    expect(channels).not.toContain('TIKTOK');
    expect(channels).not.toContain('INSTAGRAM');
  });

  it('produces business templates for non-RE with no data', () => {
    const input = makeInput({
      industryKey: 'general',
      dataItems: [],
      brandContext: 'A local bakery',
    });
    const plan = buildOnboardingGenerationPlan(input);

    expect(plan).toHaveLength(3);
    const types = plan.map((s) => s.templateType);
    expect(types).toContain('business_intro');
    expect(types).toContain('offer_highlight');
    expect(types).toContain('authority_education');
  });

  it('uses neighborhood post when listing has neighborhood data', () => {
    const input = makeInput({
      dataItems: [makeListing('L1', { neighborhood: 'South Congress' })],
    });
    const plan = buildOnboardingGenerationPlan(input);

    const types = plan.map((s) => s.templateType);
    expect(types).toContain('neighborhood_highlight');
  });

  it('uses buyer tip instead when no neighborhood data', () => {
    const input = makeInput({
      dataItems: [makeListing('L1', { neighborhood: undefined, city: undefined, state: undefined })],
    });
    const plan = buildOnboardingGenerationPlan(input);

    const types = plan.map((s) => s.templateType);
    expect(types).toContain('buyer_tip');
    expect(types).not.toContain('neighborhood_highlight');
  });

  it('includes diversity directives in later slots', () => {
    const input = makeInput({
      dataItems: [makeListing('L1')],
    });
    const plan = buildOnboardingGenerationPlan(input);

    // First slot should not have diversity directive
    expect(plan[0].guidance).not.toContain('Content diversity');
    // Second and third should
    expect(plan[1].guidance).toContain('Content diversity');
    expect(plan[2].guidance).toContain('Content diversity');
  });
});
