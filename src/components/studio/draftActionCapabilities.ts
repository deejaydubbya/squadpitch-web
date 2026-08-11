import type { DraftStatus } from '@/hooks/useSquadpitch';

export function getDraftActionCapabilities(
  status: DraftStatus,
  scheduleEligible: boolean,
) {
  const editable = status === 'DRAFT' || status === 'PENDING_REVIEW';
  return {
    isEditable: editable,
    canApprove: editable,
    canReject:
      editable ||
      status === 'APPROVED' ||
      status === 'SCHEDULED' ||
      status === 'FAILED',
    canSchedule:
      scheduleEligible &&
      (status === 'APPROVED' || status === 'SCHEDULED' || status === 'FAILED'),
    canPublish:
      status === 'APPROVED' || status === 'SCHEDULED' || status === 'FAILED',
  };
}
