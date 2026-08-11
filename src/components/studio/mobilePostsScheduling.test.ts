import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('mobile posts, approvals, and scheduling', () => {
  it('uses an agenda on phones and preserves the desktop calendar', () => {
    const planner = source('src/components/studio/PlannerView.tsx');
    const agenda = source('src/components/studio/MobilePlannerAgenda.tsx');

    expect(planner).toContain('<MobilePlannerAgenda');
    expect(planner).toContain('hidden lg:block');
    expect(planner).toContain('<CalendarGrid');
    expect(planner).toContain('<span className="lg:hidden">Agenda</span>');
    expect(agenda).toContain('aria-label="Post agenda"');
    expect(agenda).toContain('draft.scheduledFor ?? draft.publishedAt');
    expect(agenda).toContain('<DraftQueueCard');
  });

  it('retains existing approval and publishing semantics', () => {
    const card = source('src/components/studio/DraftQueueCard.tsx');

    expect(card).toContain('useApproveDraft(draft.id)');
    expect(card).toContain('useRejectDraft(draft.id)');
    expect(card).toContain('useScheduleDraft(draft.id)');
    expect(card).toContain('usePublishDraft(draft.id)');
    expect(card).toContain('validatePublishEligibility');
    expect(card).toContain("draft.status === 'PENDING_REVIEW'");
    expect(card).toContain("draft.status === 'SCHEDULED'");
    expect(card).toContain("label: 'Reschedule'");
    expect(card).toContain('Confirm rejection');
  });

  it('exposes touch-sized primary and secondary actions', () => {
    const card = source('src/components/studio/DraftQueueCard.tsx');
    const overflow = source('src/components/studio/OverflowMenu.tsx');
    const preview = source('src/components/studio/DraftPreviewCard.tsx');

    expect(card).toContain('min-h-11');
    expect(card).toContain('aria-label={`Select ${getChannelLabel(draft.channel)} post`}');
    expect(overflow).toContain('aria-label="More post actions"');
    expect(overflow).toContain('min-h-11');
    expect(preview).toContain('`Published ${new Date(draft.publishedAt).toLocaleString()}`');
  });
});
