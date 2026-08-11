import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('mobile home, more menu, and notifications', () => {
  it('gives mobile Home a focused live-data hierarchy while preserving desktop', () => {
    const home = source('src/app/(app)/workspaces/[clientId]/page.tsx');

    expect(home).toContain('aria-label="Mobile workspace overview"');
    expect(home).toContain('space-y-5 lg:hidden');
    expect(home).toContain('hidden space-y-6 lg:block');
    expect(home).toContain('inboxStats?.unreadCount');
    expect(home).toContain('summary?.scheduledUpcoming');
    expect(home).toContain('summary?.publishedThisWeek');
    expect(home).toContain('attentionItems.slice(0, 3)');
    expect(home).toContain('upcomingPosts.slice(0, 2)');
  });

  it('uses real routes, industry labels, and suite permissions in More', () => {
    const menu = source('src/components/studio/WorkspaceMoreMenu.tsx');
    const header = source('src/components/studio/WorkspaceMobileHeader.tsx');

    expect(header).toContain('<WorkspaceMoreMenu client={client} />');
    expect(menu).toContain("client.industryKey === 'real_estate'");
    expect(menu).toContain('suiteFlags?.inbox');
    expect(menu).toContain('suiteFlags?.sites');
    expect(menu).toContain('suiteFlags?.ads');
    expect(menu).toContain("href: '/workspaces'");
    expect(menu).toContain("href: '/help'");
    expect(menu).toContain('href="/auth/logout"');
  });

  it('keeps notification actions keyboard-accessible and touch-sized', () => {
    const notifications = source('src/app/(app)/notifications/page.tsx');

    expect(notifications).toContain('aria-label="Go back"');
    expect(notifications).toContain('min-h-11');
    expect(notifications).toContain('dateTime={n.createdAt}');
    expect(notifications).toContain('aria-label={`Mark ${n.title} as read`}');
    expect(notifications).toContain('focus-visible:ring-2');
  });
});
