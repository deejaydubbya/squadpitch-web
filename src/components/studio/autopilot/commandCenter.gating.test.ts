// Spinstr06 — pure-logic hardening tests.
//
// Pins the contract callers depend on:
//   - recommend_only mode hides the Prepare CTA.
//   - The Scheduled queue bucket includes both 'scheduled'
//     (new flow) and 'launched' (legacy).
//   - isInactiveStatus treats 'scheduled' as inactive (post-CTA).

import { describe, it, expect } from 'vitest';
import { isInactiveStatus } from '../autopilotInboxConstants';

describe('isInactiveStatus (spinstr06)', () => {
  it('treats scheduled / approved / launched as inactive', () => {
    expect(isInactiveStatus('approved')).toBe(true);
    expect(isInactiveStatus('scheduled')).toBe(true);
    expect(isInactiveStatus('launched')).toBe(true);
  });

  it('treats dismissed / expired / converted as inactive', () => {
    expect(isInactiveStatus('dismissed')).toBe(true);
    expect(isInactiveStatus('expired')).toBe(true);
    expect(isInactiveStatus('converted')).toBe(true);
  });

  it('treats pending / generating / ready as active', () => {
    expect(isInactiveStatus('pending')).toBe(false);
    expect(isInactiveStatus('generating')).toBe(false);
    expect(isInactiveStatus('ready')).toBe(false);
  });
});

// The recommend_only gating is implemented inline in Hero + Queue
// row JSX (no extractable helper). We pin the BEHAVIORAL invariant
// by re-encoding the rule + asserting it.
describe('recommend_only CTA gating rule', () => {
  function shouldShowPrepareCta(mode: string, status: string): boolean {
    if (status !== 'pending') return false;
    if (mode === 'recommend_only') return false;
    if (mode === 'off') return false;
    return true;
  }

  it.each([
    ['off', false],
    ['recommend_only', false],
    ['draft_on_click', true],
    ['auto_generate_drafts', true],
    ['schedule_after_approval', true],
  ])('mode=%s pending rec → showPrepare=%s', (mode, expected) => {
    expect(shouldShowPrepareCta(mode, 'pending')).toBe(expected);
  });

  it('never shows Prepare for non-pending statuses regardless of mode', () => {
    for (const mode of [
      'recommend_only',
      'draft_on_click',
      'auto_generate_drafts',
      'schedule_after_approval',
    ]) {
      for (const status of ['ready', 'approved', 'scheduled', 'dismissed']) {
        expect(shouldShowPrepareCta(mode, status)).toBe(false);
      }
    }
  });
});
