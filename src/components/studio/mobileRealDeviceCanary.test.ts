import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('real-device responsive and comped billing contracts', () => {
  it('notifications never open a desktop flyout on mobile', () => {
    const source = read('src/components/studio/NotificationBell.tsx');
    expect(source).toContain("matchMedia('(max-width: 1023px)')");
    expect(source).toContain("router.push('/notifications')");
  });

  it('Media removes its split pane and supplies a phone folder selector', () => {
    const source = read('src/components/studio/AssetLibrary.tsx');
    expect(source).toContain('hidden w-48 flex-shrink-0 space-y-1 md:block');
    expect(source).toContain('block space-y-1 md:hidden');
  });

  it('provider actions move to a full-width touch row on phones', () => {
    const source = read('src/components/studio/ChannelConnectionCard.tsx');
    expect(source).toContain('flex flex-col items-stretch gap-3 sm:flex-row');
    expect(source).toContain('min-h-11 w-full');
  });

  it('Sites actions stack before the phone viewport can clip them', () => {
    const source = read('src/app/(app)/workspaces/[clientId]/sites/_components/PagesPanel.tsx');
    expect(source).toContain('flex flex-col items-stretch justify-between');
    expect(source).toContain('min-h-11 justify-center');
  });

  it('7. comped Pro billing omits plan purchase controls and uses accurate copy', () => {
    const source = read('src/app/(app)/workspaces/[clientId]/settings/billing/page.tsx');
    expect(source).toContain('No payment is required');
    expect(source).toContain('{!isComped && <div>');
    expect(source).toContain('{hasSubscription && (');
  });
});
