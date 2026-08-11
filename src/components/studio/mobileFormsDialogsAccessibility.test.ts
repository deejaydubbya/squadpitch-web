import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('mobile forms, dialogs, keyboard, and touch', () => {
  it('prevents page overflow and mobile input zoom while preserving visible focus', () => {
    const css = source('src/app/globals.css');

    expect(css).toContain('overflow-x: clip');
    expect(css).toContain('-webkit-text-size-adjust: 100%');
    expect(css).toContain(':focus-visible');
    expect(css).toContain("input:not([type='checkbox'])");
    expect(css).toContain('font-size: 16px');
    expect(css).toContain('max-height: calc(100dvh - env(safe-area-inset-top, 0px))');
  });

  it('gives shared mobile sheets focus containment and restoration', () => {
    const sheet = source('src/components/mobile/MobileSheet.tsx');

    expect(sheet).toContain('role="dialog"');
    expect(sheet).toContain('aria-modal="true"');
    expect(sheet).toContain("event.key === 'Escape'");
    expect(sheet).toContain("event.key === 'Tab'");
    expect(sheet).toContain('previouslyFocused?.focus()');
    expect(sheet).toContain("document.body.style.overflow = 'hidden'");
  });

  it('uses viewport-safe dialog surfaces for common creation and import flows', () => {
    const paths = [
      'src/components/studio/AddDataItemModal.tsx',
      'src/components/studio/AddPropertyModal.tsx',
      'src/components/studio/AttachToPostModal.tsx',
      'src/components/studio/AutopilotPanel.tsx',
      'src/components/studio/BulkGenerateModal.tsx',
      'src/components/studio/GenerateFromDataModal.tsx',
      'src/components/studio/ImportDataModal.tsx',
      'src/components/studio/ImportPropertyUrlModal.tsx',
      'src/components/studio/MediaPickerModal.tsx',
    ];

    for (const path of paths) {
      const modal = source(path);
      expect(modal, path).toContain('mobile-dialog-backdrop');
      expect(modal, path).toContain('mobile-dialog-surface');
      expect(modal, path).toContain('role="dialog"');
      expect(modal, path).toContain('aria-modal="true"');
    }
  });

  it('associates representative form labels and exposes errors and hover actions', () => {
    const data = source('src/components/studio/AddDataItemModal.tsx');
    const reply = source('src/components/studio/GBPReviewReplyModal.tsx');

    expect(data).toContain('htmlFor="data-item-title"');
    expect(data).toContain('id="data-item-title"');
    expect(data).toContain('aria-label={`Remove image ${i + 1}`}');
    expect(data).toContain('opacity-100');
    expect(reply).toContain('htmlFor="gbp-review-reply"');
    expect(reply).toContain('id="gbp-review-reply"');
    expect(reply).toContain('role="alert"');
    expect(reply).toContain('sticky bottom-0');
  });
});
