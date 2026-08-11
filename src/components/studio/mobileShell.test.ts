import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('responsive workspace shell foundation', () => {
  it('declares a mobile-safe viewport and global overflow guard', () => {
    const layout = source('src/app/layout.tsx');
    const css = source('src/app/globals.css');

    expect(layout).toContain("width: 'device-width'");
    expect(layout).toContain("viewportFit: 'cover'");
    expect(css).toContain('overflow-x: clip');
    expect(css).toContain('--sp-mobile-nav-height');
  });

  it('maps the phone navigation to real workspace routes', () => {
    const navigation = source('src/components/studio/WorkspaceBottomNavigation.tsx');

    expect(navigation).toContain("label: t('home'), href: base");
    expect(navigation).toContain("label: t('inbox'), href: `${base}/inbox`");
    expect(navigation).toContain("label: t('create'), href: `${base}/create`");
    expect(navigation).toContain("label: t('posts'), href: `${base}/planner`");
    expect(navigation).toContain('suiteFlags?.inbox');
    expect(navigation).toContain('aria-label="Primary workspace navigation"');
  });

  it('keeps desktop navigation and clears fixed mobile navigation', () => {
    const workspaceLayout = source('src/app/(app)/workspaces/[clientId]/layout.tsx');
    const header = source('src/components/studio/WorkspaceMobileHeader.tsx');

    expect(workspaceLayout).toContain('hidden lg:block');
    expect(workspaceLayout).toContain('mobile-nav-clearance');
    expect(header).toContain('<WorkspaceBottomNavigation');
    expect(header).toContain('<MobileSheet');
  });
});
