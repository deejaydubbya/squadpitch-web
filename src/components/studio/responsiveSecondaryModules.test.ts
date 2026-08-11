import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('responsive secondary workspace modules', () => {
  it('keeps property and business inventory operable on narrow screens', () => {
    const library = source('src/components/studio/PropertyLibrary.tsx');
    const manager = source('src/components/studio/BusinessDataManager.tsx');
    const propertyCard = source('src/components/studio/PropertyCard.tsx');
    const dataCard = source('src/components/studio/DataItemCard.tsx');

    expect(library).toContain('flex flex-col gap-3 sm:flex-row');
    expect(library).toContain('overflow-x-auto');
    expect(library).toContain('min-h-11');
    expect(manager).toContain('sm:max-w-[280px]');
    expect(manager).toContain('[scrollbar-width:none]');
    expect(propertyCard).toContain('min-w-11');
    expect(dataCard).toContain('min-[400px]:flex-row');
  });

  it('uses the existing mobile inbox and planner paths for contacts and campaigns', () => {
    const inbox = source('src/app/(app)/workspaces/[clientId]/inbox/page.tsx');
    const planner = source('src/components/studio/PlannerView.tsx');
    const campaigns = source('src/app/(app)/workspaces/[clientId]/campaigns/page.tsx');

    expect(inbox).toContain("selectedId ? 'hidden' : 'block'");
    expect(planner).toContain('<MobilePlannerAgenda');
    expect(planner).toContain('hidden lg:block');
    expect(campaigns).toContain('/planner');
  });

  it('makes analytics and settings navigation horizontally scrollable', () => {
    const analytics = source('src/app/(app)/workspaces/[clientId]/analytics/page.tsx');
    const ranges = source('src/components/studio/analytics/RangeSelector.tsx');
    const settings = source('src/app/(app)/workspaces/[clientId]/settings/layout.tsx');

    expect(analytics).toContain('sm:flex-row sm:items-center sm:justify-between');
    expect(analytics).toContain('overflow-x-auto');
    expect(ranges).toContain('min-h-11 min-w-11');
    expect(settings).toContain('min-w-max');
    expect(settings).toContain('[scrollbar-width:none]');
  });

  it('stacks integration choices and preserves provider-backed operations', () => {
    const integrations = source('src/app/(app)/workspaces/[clientId]/settings/integrations/page.tsx');
    const billing = source('src/app/(app)/workspaces/[clientId]/settings/billing/page.tsx');

    expect(integrations).toContain('grid grid-cols-1 gap-3 sm:grid-cols-2');
    expect(integrations).toContain('oauthConnect.isPending');
    expect(integrations).toContain('useSheetsSpreadsheets');
    expect(integrations).toContain('sm:ml-12');
    expect(billing).toContain('portal.mutate');
    expect(billing).toContain("handlePlanAction('PRO')");
    expect(billing).toContain('min-h-11');
  });
});
