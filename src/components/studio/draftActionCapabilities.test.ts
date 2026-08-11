import { describe, expect, it } from 'vitest';
import { getDraftActionCapabilities } from './draftActionCapabilities';

describe('draft action capabilities', () => {
  it('allows review actions only for editable approval states', () => {
    expect(getDraftActionCapabilities('DRAFT', true)).toMatchObject({
      isEditable: true,
      canApprove: true,
      canReject: true,
      canSchedule: false,
      canPublish: false,
    });
    expect(getDraftActionCapabilities('PENDING_REVIEW', true).canApprove).toBe(true);
    expect(getDraftActionCapabilities('REJECTED', true).canApprove).toBe(false);
  });

  it('preserves schedule and publish transitions for approved and failed posts', () => {
    expect(getDraftActionCapabilities('APPROVED', true)).toMatchObject({
      canSchedule: true,
      canPublish: true,
    });
    expect(getDraftActionCapabilities('SCHEDULED', true)).toMatchObject({
      canSchedule: true,
      canPublish: true,
      canReject: true,
    });
    expect(getDraftActionCapabilities('FAILED', true)).toMatchObject({
      canSchedule: true,
      canPublish: true,
    });
  });

  it('never bypasses scheduling eligibility', () => {
    expect(getDraftActionCapabilities('APPROVED', false).canSchedule).toBe(false);
    expect(getDraftActionCapabilities('SCHEDULED', false).canSchedule).toBe(false);
    expect(getDraftActionCapabilities('FAILED', false).canSchedule).toBe(false);
  });
});
