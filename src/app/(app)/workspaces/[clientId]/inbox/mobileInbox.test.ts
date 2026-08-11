import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('mobile Inbox', () => {
  it('uses URL history for sequential list, thread, and details states', () => {
    const page = source('src/app/(app)/workspaces/[clientId]/inbox/page.tsx');

    expect(page).toContain("searchParams.get('c')");
    expect(page).toContain("params.set('details', '1')");
    expect(page).toContain("router[method]");
    expect(page).toContain("navigateInbox({ conversationId: id, details: false })");
    expect(page).toContain("navigateInbox({ details: true })");
    expect(page).toContain('onBack={goBack}');
    expect(page).toContain("selectedId ? 'hidden' : 'block'");
  });

  it('keeps provider readiness authoritative and makes the composer phone-safe', () => {
    const detail = source('src/app/(app)/workspaces/[clientId]/inbox/_components/ConversationDetail.tsx');
    const composer = source('src/app/(app)/workspaces/[clientId]/inbox/_components/Composer.tsx');

    expect(detail).toContain('conv.availableReplyActions ?? []');
    expect(composer).toContain('primaryReplyAction(availableActions)');
    expect(composer).toContain('smsAction?.available ?? false');
    expect(composer).toContain('isProviderConnectionAction(authoritativePrimaryAction)');
    expect(composer).toContain('role="tablist"');
    expect(composer).toContain('overflow-x-auto');
    expect(composer).toContain('max-h-[28dvh]');
    expect(composer).toContain('min-h-11');
  });

  it('provides touch-sized list, thread, and contact actions', () => {
    const list = source('src/app/(app)/workspaces/[clientId]/inbox/_components/ConversationList.tsx');
    const detail = source('src/app/(app)/workspaces/[clientId]/inbox/_components/ConversationDetail.tsx');
    const contact = source('src/app/(app)/workspaces/[clientId]/inbox/_components/ContactSidebar.tsx');

    expect(list).toContain('aria-label="Search conversations"');
    expect(list).toContain('min-h-[76px]');
    expect(detail).toContain('sm:max-w-[80%]');
    expect(detail).toContain('overscroll-contain');
    expect(contact).toContain('aria-label={`Copy ${label}`}');
    expect(contact).toContain('env(safe-area-inset-bottom,0px)');
  });
});
