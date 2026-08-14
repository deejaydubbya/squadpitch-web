import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('free trial customer experience', () => {
  const page = readFileSync('src/app/(app)/workspaces/[clientId]/settings/billing/page.tsx', 'utf8');
  const hook = readFileSync('src/hooks/useBilling.ts', 'utf8');

  it('offers a no-card 14-day Pro trial with honest conversion copy', () => {
    expect(page).toContain('Try Pro free for 14 days');
    expect(page).toContain('No card required and no charge today');
    expect(page).toContain('Add payment method');
    expect(page).toContain('your data will remain available on the Free plan');
  });

  it('supports active and ended trial states through server APIs', () => {
    expect(page).toContain('Pro trial active');
    expect(page).toContain('Your free trial has ended');
    expect(hook).toContain("apiFetch<TrialSummary>('billing/trial')");
    expect(hook).toContain("apiFetch<Subscription>('billing/trial/start'");
  });

  it('routes the public Pro offer into the no-card trial handoff', () => {
    const landing = readFileSync('src/app/(public)/page.tsx', 'utf8');
    const handoff = readFileSync('src/app/(app)/signup/continue/page.tsx', 'utf8');
    expect(landing).toContain('/signup/continue?startTrial=1');
    expect(landing).toContain('Start 14-day free trial');
    expect(handoff).toContain('billing/trial/start');
  });
});
