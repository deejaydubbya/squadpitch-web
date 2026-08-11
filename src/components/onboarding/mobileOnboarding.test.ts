import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('mobile onboarding responsive contract', () => {
  it('uses dynamic viewport height, safe areas, and accessible progress', () => {
    const shell = source('src/components/onboarding/OnboardingShell.tsx');
    expect(shell).toContain('h-dvh');
    expect(shell).toContain('safe-area-top');
    expect(shell).toContain('role="progressbar"');
    expect(shell).toContain('aria-valuetext');
  });

  it('provides single-column phone forms at 320px and adaptive layouts through desktop', () => {
    const industries = source('src/components/onboarding/cards/IndustrySelectCard.tsx');
    const listing = source('src/components/onboarding/cards/REListingFormCard.tsx');

    expect(industries).toContain('grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3');
    expect(listing).toContain('grid-cols-1 gap-2 min-[390px]:grid-cols-3');
    expect(listing).toContain('grid-cols-1 gap-2 min-[375px]:grid-cols-2');
    expect(listing).toContain('grid-cols-2 gap-2 sm:grid-cols-4');
  });

  it('keeps required mobile flows reachable and optional setup skippable', () => {
    const thread = source('src/components/onboarding/OnboardingMessageThread.tsx');
    const channels = source('src/components/onboarding/cards/OnboardingChannelConnect.tsx');
    const photos = source('src/components/onboarding/cards/ListingPhotoOfferCard.tsx');
    const persistence = source('src/lib/onboarding/persistence.ts');

    for (const card of ['industry_select', 're_listing_form', 'brand_preview', 'channel_connect', 'campaign_presentation', 'completion_summary']) {
      expect(thread).toContain(`case '${card}'`);
    }
    expect(channels).toContain('Skip for now');
    expect(photos).toContain('add photos later');
    expect(persistence).toContain('localStorage');
  });

  it('makes mobile image generation keyboard-safe and scrollable', () => {
    const modal = source('src/components/onboarding/GenerateImageModal.tsx');
    expect(modal).toContain('100dvh');
    expect(modal).toContain('overflow-y-auto');
    expect(modal).toContain('safe-area-bottom');
    expect(modal).toContain('aria-label="Close image generator"');
  });
});
