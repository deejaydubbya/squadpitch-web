import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('account-wide workspace invitation surfaces', () => {
  it('uses one canonical account query and invalidates invitations plus owned workspaces after claim', () => {
    const hooks = source('src/hooks/useWorkspaceInvitations.ts');
    expect(hooks).toContain("apiFetch<WorkspaceInvitationsResponse>('workspace-invitations'");
    expect(hooks).toContain('workspaceInvitationKey');
    expect(hooks).toContain("apiFetch<{ clientId: string; businessName: string; idempotent?: boolean }>(`prospect-claims/${id}/claim`");
    expect(hooks).toContain("queryKey: ['squadpitch', 'clients']");
  });

  it('keeps dismissal session-local and leaves durable invitation data untouched', () => {
    const banner = source('src/components/invitations/WorkspaceInvitationBanner.tsx');
    expect(banner).toContain('sessionStorage.setItem');
    expect(banner).toContain('/workspaces#pending-invitations');
    expect(banner).not.toContain('decline');
    expect(banner).not.toContain('apiFetch');
  });

  it('shows invitations separately in the workspace switcher and on mobile navigation', () => {
    const switcher = source('src/app/(app)/workspaces/page.tsx');
    const more = source('src/components/studio/WorkspaceMoreMenu.tsx');
    expect(switcher).toContain('Pending invitations (');
    expect(switcher).toContain('They are not part of your account yet');
    expect(more).toContain('pending`');
  });

  it('supports responsive preview and claim actions without forced workspace switching', () => {
    const card = source('src/components/invitations/InvitationCard.tsx');
    const preview = source('src/app/(public)/preview/[token]/PreviewClient.tsx');
    expect(card).toContain('min-[360px]:flex-row');
    expect(card).toContain('Workspace claimed successfully');
    expect(card).toContain('You can stay here');
    expect(preview).toContain('workspace-invitations/${encodeURIComponent(invitationId)}/preview');
    expect(preview).toContain('Or stay here to finish reviewing');
  });
});
