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

  it('uses separate preview and claim credentials without sending claim in preview requests', () => {
    const admin = read('src/app/(app)/admin/prospects/page.tsx');
    const preview = read('src/app/(public)/preview/[token]/PreviewClient.tsx');
    expect(admin).toContain('#claim=${item.claimToken}');
    expect(preview).toContain('window.location.hash.match');
    expect(preview).toContain('/api/public/prospects/preview/');
    expect(preview).toContain('sessionStorage.setItem("squadpitch.prospectClaimToken"');
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
    expect(editor).toContain('Importing listing and preparing posts');
    expect(editor).toContain('Property imported. Sample posts are ready for review.');
    expect(editor).toContain('Sample content is ready. Select what you want to show publicly below.');
    expect(editor).toContain('Nothing selected. Prepare sample content above');
    expect(editor).toContain('Move preview item up');
    expect(editor).toContain('Move preview item down');
    expect(editor).toContain('Remove preview item');
    expect(editor).toContain('Save preview selection');
  });

  it('renders imported property facts as hero content without admin provenance text', () => {
    const preview = read('src/app/(public)/preview/[token]/PreviewClient.tsx');
    expect(preview).toContain('Featured property');
    expect(preview).toContain('item.property.price.toLocaleString()');
    expect(preview).toContain('item.property.beds');
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

  it('renders honest public empty states instead of an indefinite fake loading message', () => {
    const preview = read('src/app/(public)/preview/[token]/PreviewClient.tsx');
    expect(preview).toContain("Preview setup has not started yet.");
    expect(preview).toContain("Preview content hasn&apos;t been selected yet.");
    expect(preview).not.toContain('Sample posts are still being prepared.');
  });

  it('polls canonical curate state only while preparation is active', () => {
    const hooks = read('src/hooks/useAdmin.ts');
    const editor = read('src/app/(app)/admin/prospects/[id]/page.tsx');
    expect(hooks).toContain('refetchInterval: preparationActive ? 2_000 : false');
    expect(hooks).toContain('refetchIntervalInBackground: false');
    expect(hooks).toContain('onSettled:');
    expect(editor).toContain('useAdminProspect(id, prepare.isPending)');
    expect(editor).toContain('of 3 posts ready');
    expect(editor).toContain('aria-live="polite"');
    expect(editor).toContain('selectionDirty');
  });
});
