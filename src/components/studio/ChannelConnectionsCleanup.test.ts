import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8');

const list = read('src/components/studio/ChannelConnectionsList.tsx');
const card = read('src/components/studio/ChannelConnectionCard.tsx');
const registry = read('src/lib/channelRegistry.ts');

describe('Channels settings customer-facing cleanup', () => {
  it('removes the stale Meta development warning from the channel list', () => {
    expect(list).not.toContain('Meta app still in development');
    expect(list).not.toContain('App Roles');
    expect(list).not.toContain('Meta developer dashboard');
  });

  it('does not render BETA availability labels on supported channel cards', () => {
    expect(card).not.toContain('availability === "BETA"');
    expect(card).not.toMatch(/>\s*Beta\s*</);
    expect(card).not.toContain('CHANNEL_REGISTRY');
    expect(registry).toContain('availability: "BETA"');
    expect(registry).toContain('availability: "COMING_SOON"');
  });

  it('removes Instagram scope copy while preserving connection safeguards', () => {
    expect(card).not.toContain('INSTAGRAM_CONNECTION_DESCRIPTION');
    for (const scope of [
      'instagram_business_basic',
      'instagram_business_content_publish',
      'instagram_business_manage_insights',
      'instagram_business_manage_comments',
    ]) {
      expect(card).not.toContain(scope);
    }
    expect(card).toContain('INSTAGRAM_RECONNECT_BANNER');
    expect(card).toContain('instagramConnectionNeedsReconnect');
  });

  it('retains connect actions, recommendation labels, and channel groups', () => {
    expect(card).toContain('`Connect ${meta.label}`');
    expect(card).toContain('onClick={handleConnect}');
    expect(card).toContain('Recommended');
    expect(card).toContain('Good fit');
    expect(card).toContain('Optional');
    expect(list).toContain('Recommended for your industry');
    expect(list).toContain('Coming Soon');
  });

  it('keeps the mobile card stack and full-width connect target', () => {
    expect(card).toContain(
      'flex flex-col items-stretch gap-3 sm:flex-row sm:items-start',
    );
    expect(card).toContain('min-h-11 w-full');
    expect(card).toContain('sm:min-h-0 sm:w-auto');
  });
});
