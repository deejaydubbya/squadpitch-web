// Lock-in tests for the public-vs-authenticated contract:
//   - middleware lists the new legal pages as public
//   - robots.txt allows them and disallows authenticated app surfaces
//   - sitemap.xml lists exactly the public pages, no app routes

import { describe, it, expect } from 'vitest';
import { PUBLIC_PATHS } from './../middleware';
import robots from './robots';
import sitemap from './sitemap';

describe('PUBLIC_PATHS — middleware allowlist', () => {
  it('includes the landing page', () => {
    expect(PUBLIC_PATHS).toContain('/');
  });

  it('includes the new legal/trust pages', () => {
    expect(PUBLIC_PATHS).toContain('/privacy');
    expect(PUBLIC_PATHS).toContain('/terms');
    expect(PUBLIC_PATHS).toContain('/help');
  });

  it('does NOT include any authenticated app paths', () => {
    expect(PUBLIC_PATHS).not.toContain('/workspaces');
    expect(PUBLIC_PATHS).not.toContain('/admin');
    expect(PUBLIC_PATHS).not.toContain('/onboarding');
    expect(PUBLIC_PATHS).not.toContain('/notifications');
    expect(PUBLIC_PATHS).not.toContain('/activity');
  });
});

describe('robots.txt', () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
  const allow = (rules?.allow ?? []) as string[];
  const disallow = (rules?.disallow ?? []) as string[];

  it('allows the public legal pages', () => {
    expect(allow).toContain('/');
    expect(allow).toContain('/privacy');
    expect(allow).toContain('/terms');
    expect(allow).toContain('/help');
  });

  it('disallows authenticated app surfaces and APIs', () => {
    expect(disallow.some((p) => p.startsWith('/workspaces'))).toBe(true);
    expect(disallow.some((p) => p.startsWith('/admin'))).toBe(true);
    expect(disallow).toContain('/onboarding');
    expect(disallow).toContain('/api/');
    expect(disallow).toContain('/auth/');
  });

  it('points to a sitemap URL', () => {
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

describe('sitemap.xml', () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it('lists every public, indexable page', () => {
    expect(urls.some((u) => u.endsWith('/'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/privacy'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/terms'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/help'))).toBe(true);
  });

  it('does not include authenticated routes', () => {
    expect(urls.some((u) => u.includes('/workspaces'))).toBe(false);
    expect(urls.some((u) => u.includes('/admin'))).toBe(false);
    expect(urls.some((u) => u.includes('/onboarding'))).toBe(false);
  });
});
