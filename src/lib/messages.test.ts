// Phase 3 multilingual support — message bundle smoke tests.
//
// Sanity-checks the JSON bundles ship the keys the dashboard
// expects. If a new translation key is added in en.json without an
// es.json equivalent, this test fires before the user sees a raw
// key like "settings.contentLanguage.label" rendered on screen.

import { describe, it, expect } from 'vitest';
import en from '../../messages/en.json';
import es from '../../messages/es.json';

function flatten(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') out.push(...flatten(v, key));
    else out.push(key);
  }
  return out;
}

describe('Phase 3 message bundles', () => {
  it('en.json carries the starter-slice nav keys', () => {
    const keys = flatten(en);
    expect(keys).toContain('nav.home');
    expect(keys).toContain('nav.create');
    expect(keys).toContain('nav.planner');
    expect(keys).toContain('nav.settings');
    expect(keys).toContain('nav.activity');
  });

  it('en.json carries content + app language section keys', () => {
    expect(en.settings.contentLanguage.label).toBeTruthy();
    expect(en.settings.contentLanguage.description).toBeTruthy();
    expect(en.settings.appLanguage.label).toBeTruthy();
    expect(en.settings.appLanguage.description).toBeTruthy();
  });

  it('en.json carries the common-button starter set', () => {
    expect(en.common.save).toBeTruthy();
    expect(en.common.cancel).toBeTruthy();
    expect(en.common.loading).toBeTruthy();
    expect(en.common.error).toBeTruthy();
    expect(en.common.success).toBeTruthy();
  });

  it('es.json has translations for every key in en.json', () => {
    const enKeys = flatten(en).sort();
    const esKeys = flatten(es).sort();
    const missing = enKeys.filter((k) => !esKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it('Spanish strings are not just copies of English (sanity check)', () => {
    // Catches a copy/paste accident where someone forgets to
    // translate. We don't require EVERY key to differ (e.g.
    // "Suite" is identical in both), but the user-visible labels
    // we care about must differ.
    expect(es.nav.home).not.toBe(en.nav.home);
    expect(es.nav.settings).not.toBe(en.nav.settings);
    expect(es.common.save).not.toBe(en.common.save);
    expect(es.common.cancel).not.toBe(en.common.cancel);
    expect(es.settings.contentLanguage.label).not.toBe(
      en.settings.contentLanguage.label,
    );
  });
});
