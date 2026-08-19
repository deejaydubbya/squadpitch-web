import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('prospect preview and claim flows', () => {
  it('keeps preview public while claim returns through protected Auth0 routing', () => {
    const proxy = read('src/proxy.ts');
    expect(proxy).toContain('pathname.startsWith("/preview/")');
    expect(proxy).not.toContain('pathname.startsWith("/claim/")');
    expect(proxy).toContain('safeReturnTo(`${pathname}${request.nextUrl.search}`');
  });

  it('uses the server-provided outreach claim URL without rebuilding credentials in the browser', () => {
    const admin = read('src/app/(app)/admin/prospects/page.tsx');
    const preview = read('src/app/(public)/preview/[token]/PreviewClient.tsx');
    expect(admin).toContain('href={row.claimUrl}');
    expect(preview).toContain('window.location.hash.match');
    expect(preview).toContain('/api/public/prospects/preview/');
    expect(preview).toContain('sessionStorage.setItem("squadpitch.prospectClaimToken"');
  });

  it('shows honest outreach preview progress and withholds the preview action while generating', () => {
    const admin = read('src/app/(app)/admin/prospects/page.tsx');
    const hooks = read('src/hooks/useAdmin.ts');
    expect(admin).toContain('row.status === "PREVIEW_GENERATING"');
    expect(admin).toContain('row.status === "PREVIEW_PENDING"');
    expect(admin).toContain("Queued…");
    expect(admin).toContain('Preparing Preview…');
    expect(admin).toContain('animate-spin');
    expect(admin).toContain('["READY_TO_EMAIL", "EMAIL_FAILED", "EMAIL_SENT", "UNCLAIMED", "CLAIMED", "BOUNCED", "UNSUBSCRIBED"].includes(row.status) && row.claimUrl');
    expect(admin).toContain('row.status === "PREVIEW_FAILED" ? "Retry"');
    expect(hooks).toContain('refetchInterval: 5000');
  });

  it('supports Microsoft 365 STARTTLS and ready-preview regeneration', () => {
    const admin = read('src/app/(app)/admin/prospects/page.tsx');
    expect(admin).toContain('Microsoft 365 / Outlook');
    expect(admin).toContain('smtp.office365.com');
    expect(admin).toContain('<option value="STARTTLS">STARTTLS</option>');
    expect(admin).toContain('<option value="SSL_TLS">SSL/TLS</option>');
    expect(admin).toContain('smtpEncryption === "SSL_TLS"');
    expect(admin).toContain('Regenerate Preview');
    expect(admin).toContain('allowRegenerate={tab === "Ready for Email"}');
  });

  it('edits and safely previews multipart outreach templates', () => {
    const admin = read('src/app/(app)/admin/prospects/page.tsx');
    const hooks = read('src/hooks/useAdmin.ts');
    expect(admin).toContain('Email Template');
    expect(admin).toContain('Plain Text');
    expect(admin).toContain('DOMPurify.sanitize');
    expect(admin).toContain('row.emailHtmlBody');
    expect(hooks).toContain('textBody: string');
    expect(hooks).toContain('htmlBody: string');
    expect(hooks).toContain('internal/agent-outreach/template');
  });

  it('renders mobile-safe public preview and explicit unpublished disclosure', () => {
    const preview = read('src/app/(public)/preview/[token]/PreviewClient.tsx');
    expect(preview).toContain('px-4');
    expect(preview).toMatch(/Nothing has been connected,\s+scheduled, or published/);
    expect(preview).toContain('Claim this workspace');
  });

  it('makes preview curation explicit, ordered, removable, and empty-safe', () => {
    const editor = read('src/app/(app)/admin/prospects/[id]/page.tsx');
    expect(editor).toContain('Only selected content is visible');
    expect(editor).toContain('Prepare sample content');
    expect(editor).toContain('through Squadpitch&apos;s property pipeline');
    expect(editor).toContain('Preparation in progress');
    expect(editor).toContain('Preparation complete.');
    expect(editor).toContain('Preparation completed with warnings.');
    expect(editor).toContain('Nothing selected. Prepare sample content above');
    expect(editor).toContain('Move preview item up');
    expect(editor).toContain('Move preview item down');
    expect(editor).toContain('Remove preview item');
    expect(editor).toContain('Save preview selection');
  });

  it('renders imported property facts as hero content without admin provenance text', () => {
    const preview = read('src/app/(public)/preview/[token]/PreviewClient.tsx');
    expect(preview).toContain('Listings used for this preview');
    expect(preview).toContain("Here&apos;s what Squadpitch created from the listings above.");
    expect(preview).toContain('item.property.price.toLocaleString()');
    expect(preview).toContain('item.property.beds');
    expect(preview).toContain('item.property.yearBuilt');
    expect(preview).toContain('item.summary && !item.property');
    expect(preview).toContain('<DraftMediaGallery draft={draft} />');
    expect(preview).toContain('Show previous image');
    expect(preview).toContain('Show next image');
    expect(preview).toContain('overflow-x-auto');
    expect(preview).toContain('{draft.body}');
    expect(preview).toContain('Draft preview');
    expect(preview).toContain('Each card shows its exact stored draft and assigned media.');
    expect(preview).toContain('prepared post');
    expect(preview).toContain('selected images');
    expect(preview).toContain('Claim to edit these drafts');
    expect(preview).not.toContain('Operator-supplied source reference');
  });

  it('keeps profile-photo and listing-count preview variants intentional', () => {
    const preview = read('src/app/(public)/preview/[token]/PreviewClient.tsx');
    expect(preview).toContain('preview.logoUrl && <AgentProfileImage');
    expect(preview).toContain('if (failed) return null');
    expect(preview).toContain('onError={() => setFailed(true)}');
    expect(preview).toContain('object-cover');
    expect(preview).toContain('preview.items.length === 1 ? "max-w-2xl"');
    expect(preview).toContain('preview.items.length === 2 ? "sm:grid-cols-2"');
    expect(preview).toContain('"sm:grid-cols-2 lg:grid-cols-3"');
    expect(preview).toContain('h-44 w-full object-cover');
    expect(preview).toContain('xl:grid-cols-3');
  });

  it('reuses the exact claim-token handoff for the lower preview CTA', () => {
    const preview = read('src/app/(public)/preview/[token]/PreviewClient.tsx');
    expect(preview.match(/onClick={continueToClaim}/g)).toHaveLength(2);
    expect(preview).toContain('sessionStorage.setItem("squadpitch.prospectClaimToken", claimToken)');
    expect(preview).toContain('window.location.assign("/claim")');
  });

  it('renders honest public empty states instead of an indefinite fake loading message', () => {
    const preview = read('src/app/(public)/preview/[token]/PreviewClient.tsx');
    expect(preview).toContain("Preview setup has not started yet.");
    expect(preview).toContain("Preview content hasn&apos;t been selected yet.");
    expect(preview).not.toContain('Sample posts are still being prepared.');
  });

  it('polls canonical curate state only while preparation is active', () => {
    const hooks = read('src/hooks/useAdmin.ts');
    const editor = read('src/app/(app)/admin/prospects/[id]/page.tsx');
    expect(hooks).toContain('includes(query.state.data?.preparationRun?.status');
    expect(hooks).toContain('refetchIntervalInBackground: false');
    expect(hooks).toContain('onSettled:');
    expect(editor).toContain('useAdminProspect(id)');
    expect(editor).toContain('run.expectedCount');
    expect(editor).toContain('aria-live="polite"');
    expect(editor).toContain('selectionDirty');
  });

  it('gates onboarding on authoritative verification and offers all pending workspaces', () => {
    const gate = read('src/components/onboarding/VerifiedWorkspaceGate.tsx');
    const onboarding = read('src/app/(app)/onboarding/page.tsx');
    expect(onboarding).toContain('<VerifiedWorkspaceGate>');
    expect(gate).toContain("I've verified my email");
    expect(gate).toContain('identity/verification');
    expect(gate).toContain('Resend verification email');
    expect(gate).toContain('state.pendingClaims.map');
    expect(gate).toContain('Create a different workspace');
    expect(gate).toContain('getting-started?claimed=true');
  });

  it('lets admins persist supported preparation channels and keeps counts authoritative', () => {
    const editor = read('src/app/(app)/admin/prospects/[id]/page.tsx');
    const hooks = read('src/hooks/useAdmin.ts');
    expect(editor).toContain('Prepare content for');
    expect(editor).toContain('selectedChannels: preparationChannels');
    expect(editor).toContain('preparationChannels.length === 0');
    expect(hooks).toContain('selectedChannels?: Array<"INSTAGRAM" | "FACEBOOK" | "LINKEDIN">');
    expect(editor).toContain('run.expectedCount');
  });
});
