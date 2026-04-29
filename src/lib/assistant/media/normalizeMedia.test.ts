import { describe, it, expect } from 'vitest';
import { replaceSyntheticIds } from './normalizeMedia';

// ── replaceSyntheticIds ─────────────────────────────────────────────

describe('replaceSyntheticIds', () => {
  it('replaces synthetic IDs with real ones from the map', () => {
    const map = new Map([
      ['property_img_0', 'real-abc'],
      ['property_img_1', 'real-def'],
    ]);
    const result = replaceSyntheticIds(
      ['property_img_0', 'existing-id', 'property_img_1'],
      map
    );
    expect(result).toEqual(['real-abc', 'existing-id', 'real-def']);
  });

  it('filters out synthetic IDs not found in the map', () => {
    const map = new Map<string, string>();
    const result = replaceSyntheticIds(
      ['property_img_0', 'real-id', 'item_img_2'],
      map
    );
    // property_img_0 and item_img_2 are not in the map, so they remain synthetic and get filtered
    expect(result).toEqual(['real-id']);
  });

  it('passes through real IDs unchanged', () => {
    const result = replaceSyntheticIds(
      ['abc123', 'def456'],
      new Map()
    );
    expect(result).toEqual(['abc123', 'def456']);
  });

  it('handles empty input', () => {
    const result = replaceSyntheticIds([], new Map());
    expect(result).toEqual([]);
  });

  it('handles mix of property_img and item_img', () => {
    const map = new Map([
      ['property_img_0', 'real-prop'],
      ['item_img_0', 'real-item'],
    ]);
    const result = replaceSyntheticIds(
      ['property_img_0', 'item_img_0', 'item_img_1'],
      map
    );
    // item_img_1 not in map → stays synthetic → filtered out
    expect(result).toEqual(['real-prop', 'real-item']);
  });
});
