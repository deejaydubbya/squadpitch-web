import { describe, it, expect } from 'vitest';
import { classifyImageLabel, resolveMotionPreset, getClipDuration } from './motionPresets';

describe('classifyImageLabel', () => {
  it('classifies kitchen from label', () => {
    expect(classifyImageLabel('kitchen-photo-1.jpg')).toBe('kitchen');
  });

  it('classifies bedroom from label with variant', () => {
    expect(classifyImageLabel('master suite angle 2.jpg')).toBe('bedroom');
  });

  it('classifies bathroom from tags', () => {
    expect(classifyImageLabel('IMG_0042.jpg', ['bathroom', 'tile'])).toBe('bathroom');
  });

  it('classifies living room from label', () => {
    expect(classifyImageLabel('great-room-wide.jpg')).toBe('living_room');
  });

  it('classifies dining room', () => {
    expect(classifyImageLabel('breakfast nook view.jpg')).toBe('dining_room');
  });

  it('classifies exterior', () => {
    expect(classifyImageLabel('curb-appeal-front.jpg')).toBe('exterior');
  });

  it('classifies backyard from patio tag', () => {
    expect(classifyImageLabel('IMG_1234.jpg', ['patio', 'outdoor'])).toBe('backyard');
  });

  it('classifies aerial from drone tag', () => {
    expect(classifyImageLabel('DJI_0001.jpg', ['drone', 'aerial'])).toBe('aerial');
  });

  it('returns other for unrecognized labels', () => {
    expect(classifyImageLabel('IMG_9999.jpg', ['misc'])).toBe('other');
  });

  it('classifies pool as backyard', () => {
    expect(classifyImageLabel('pool-view.jpg')).toBe('backyard');
  });
});

describe('resolveMotionPreset', () => {
  it('returns pan_horizontal for kitchen', () => {
    const preset = resolveMotionPreset('kitchen', 0);
    expect(preset.type).toBe('pan_horizontal');
    expect(preset.scaleRange).toEqual([1.12, 1.12]);
  });

  it('alternates pan direction on odd indices', () => {
    const even = resolveMotionPreset('kitchen', 0);
    const odd = resolveMotionPreset('kitchen', 1);
    expect(even.panOffset[0]).toBeLessThan(0); // left-to-right
    expect(odd.panOffset[0]).toBeGreaterThan(0); // right-to-left
  });

  it('does not alternate zoom presets', () => {
    const even = resolveMotionPreset('exterior', 0);
    const odd = resolveMotionPreset('exterior', 1);
    expect(even.type).toBe('zoom_in');
    expect(odd.type).toBe('zoom_in');
    expect(even.panOffset).toEqual(odd.panOffset);
  });

  it('returns zoom_out for aerial', () => {
    const preset = resolveMotionPreset('aerial', 0);
    expect(preset.type).toBe('zoom_out');
    expect(preset.scaleRange[0]).toBeGreaterThan(preset.scaleRange[1]);
  });
});

describe('getClipDuration', () => {
  // Values come from CLIP_DURATIONS in motionPresets.ts. Tuned for visual
  // pacing — bump these here whenever the source map changes, not the
  // other way around.
  it('returns 4.5s for aerial', () => {
    expect(getClipDuration('aerial')).toBe(4.5);
  });

  it('returns 3s for bathroom', () => {
    expect(getClipDuration('bathroom')).toBe(3.0);
  });

  it('falls back to the 3.5s default for "other"', () => {
    expect(getClipDuration('other')).toBe(3.5);
  });

  it('returns 4s for exterior', () => {
    expect(getClipDuration('exterior')).toBe(4.0);
  });
});
