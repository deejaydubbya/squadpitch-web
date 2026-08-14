import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/feedback/FeedbackDialog.tsx', 'utf8');
const adminFeedbackSource = readFileSync('src/app/(app)/admin/beta-ops/feedback/page.tsx', 'utf8');

describe('feedback dialog contracts', () => {
  it('provides all four types, required message copy, success, retry, and duplicate protection', () => {
    for (const label of ['Bug', 'Feature request', 'Confusing / hard to use', 'General feedback']) expect(source).toContain(label);
    expect(source).toContain("Tell us what happened or what you&apos;d like to see.");
    expect(source).toContain('Thanks — your feedback was sent.');
    expect(source).toContain("key.current");
    expect(source).toContain("apiFetch('feedback'");
    expect(source).not.toContain("apiFetch('v1/feedback'");
    expect(source).toContain("'Retry'");
  });
  it('captures only explicit safe context and privacy-safe analytics', () => {
    expect(source).toContain('window.location.pathname');
    expect(source).toContain('deviceClass');
    expect(source).not.toMatch(/cookie|localStorage|innerHTML|outerHTML/);
    expect(source).not.toContain("message: message.trim(), type");
  });
  it('is present in desktop and mobile navigation', () => {
    expect(readFileSync('src/components/studio/Sidebar.tsx', 'utf8')).toContain('<FeedbackDialog clientId={client.id}');
    expect(readFileSync('src/components/studio/WorkspaceMoreMenu.tsx', 'utf8')).toContain('<FeedbackDialog clientId={client.id}');
  });
  it('uses the API contract when saving internal admin notes', () => {
    expect(adminFeedbackSource).toContain('updateMutation.mutate({ adminNote: notes || null })');
    expect(adminFeedbackSource).not.toContain('updateMutation.mutate({ internalNotes: notes || null })');
  });
});
