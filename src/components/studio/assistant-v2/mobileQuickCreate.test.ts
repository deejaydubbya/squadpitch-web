import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('mobile Quick Create', () => {
  it('prioritizes the real single-post workflow on phones and preserves desktop choices', () => {
    const create = source('src/app/(app)/workspaces/[clientId]/create/page.tsx');
    const modes = source('src/components/studio/assistant-v2/cards/ModeCard.tsx');

    expect(create).toContain('var(--sp-mobile-nav-height)');
    expect(create).toContain('lg:inset-y-0');
    expect(modes).toContain("payload: 'quick_post'");
    expect(modes).toContain('Quick Create');
    expect(modes).toContain('Desktop recommended');
    expect(modes).toContain('sm:grid-cols-2');
  });

  it('keeps advanced campaign creation available with a path back', () => {
    const shell = source('src/components/studio/assistant-v2/ConversationalShell.tsx');
    const hook = source('src/hooks/useConversationalAssistant.ts');

    expect(shell).toContain("session.mode === 'campaign'");
    expect(shell).toContain('<DesktopRecommendedNotice>');
    expect(shell).toContain('Back to Quick Create');
    expect(shell).toContain("resetToMode('quick_post')");
    expect(hook).toContain("const resetToMode = useCallback((mode: 'campaign' | 'quick_post')");
    expect(hook).toContain("dispatchConversation({ type: 'CLEAR' })");
  });

  it('uses existing generation, improvement, media, save, and approval behavior', () => {
    const generation = source('src/components/studio/assistant-v2/cards/GenerationCard.tsx');
    const improve = source('src/components/studio/assistant-v2/cards/post-editor/useImproveAction.ts');
    const thread = source('src/components/studio/assistant-v2/MessageThread.tsx');

    expect(generation).toContain("executeSaveWithNormalize('draft')");
    expect(generation).toContain("executeSaveWithNormalize('approve')");
    expect(generation).toContain('generateImage');
    expect(improve).toContain('useGenerateContent');
    expect(improve).toContain('buildImproveGuidance');
    expect(thread).toContain("case 'quick_post_guidance'");
    expect(thread).toContain("case 'media_select'");
    expect(thread).toContain("case 'generation'");
  });
});
