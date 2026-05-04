'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, Megaphone, MessageSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClient } from '@/hooks/useSquadpitch';
import { CreateContentForm } from '@/components/studio/CreateContentForm';
import { ContentPreview } from '@/components/studio/ContentPreview';
import { ConversationalShell } from '@/components/studio/assistant-v2/ConversationalShell';
import { ListingCampaignPage } from '@/components/studio/ListingCampaignPage';
import type { Draft } from '@/hooks/useSquadpitch';

type Mode = 'select' | 'single' | 'campaign' | 'assistant';

export default function CreatePage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: client } = useClient(clientId);

  const initialGuidance = searchParams.get('guidance') ?? undefined;
  const initialTemplateType = searchParams.get('templateType') ?? undefined;
  const listingId = searchParams.get('listingId') ?? undefined;
  const campaignType = searchParams.get('type') ?? undefined;

  const modeParam = searchParams.get('mode') as Mode | null;
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);
  const [pendingAssetId, setPendingAssetId] = useState<string | undefined>();

  // Resolve initial mode from query params
  const [mode, setMode] = useState<Mode>(() => {
    if (modeParam === 'campaign' || modeParam === 'assistant' || modeParam === 'single') return modeParam;
    // Auto-select single if guidance was provided (from recommendations)
    if (initialGuidance) return 'single';
    return 'select';
  });

  // Sync mode when search params change
  useEffect(() => {
    if (modeParam && ['single', 'campaign', 'assistant'].includes(modeParam)) {
      setMode(modeParam as Mode);
    }
  }, [modeParam]);

  const isRE = client?.industryKey === 'real_estate';

  // ── Campaign mode — redirect non-RE users ──
  if (mode === 'campaign') {
    if (!client) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-6 h-6 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
        </div>
      );
    }
    if (!isRE) {
      return (
        <div className="fixed inset-0 lg:left-64 z-10 bg-sp-bg">
          <ConversationalShell clientId={clientId} />
        </div>
      );
    }
    const inputParam = searchParams.get('input') ?? undefined;
    return <ListingCampaignPage clientId={clientId} initialUrl={inputParam} />;
  }

  // ── Assistant mode ──
  if (mode === 'assistant') {
    return (
      <div className="fixed inset-0 lg:left-64 z-10 bg-sp-bg">
        <ConversationalShell clientId={clientId} />
      </div>
    );
  }

  // ── Single post mode ──
  if (mode === 'single') {
    if (generatedDraft) {
      return (
        <ContentPreview
          draft={generatedDraft}
          clientId={clientId}
          pendingAssetId={pendingAssetId}
          onDiscard={() => { setGeneratedDraft(null); setPendingAssetId(undefined); }}
          onRegenerate={() => { setGeneratedDraft(null); setPendingAssetId(undefined); }}
        />
      );
    }

    return (
      <CreateContentForm
        clientId={clientId}
        initialGuidance={initialGuidance}
        initialTemplateType={initialTemplateType}
        onGenerated={(draft, assetId) => { setGeneratedDraft(draft); setPendingAssetId(assetId); }}
      />
    );
  }

  // ── Mode selection ──
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white-100">Create</h1>
        <p className="text-sm text-white-40">Choose how you want to create content</p>
      </div>

      <div className="grid gap-4">
        {/* Single Post */}
        <button
          onClick={() => router.push(`/workspaces/${clientId}/create?mode=single`)}
          className="flex items-center gap-4 p-5 rounded-2xl border border-white-10 bg-sp-card hover:border-accent-green-110/40 hover:bg-accent-green-110/5 transition-all group text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-accent-green-110/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-accent-green-110" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white-100">Single Post</p>
            <p className="text-xs text-white-40 mt-0.5">Describe what you want and get a ready-to-publish post</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white-20 group-hover:text-accent-green-110 transition-colors flex-shrink-0" />
        </button>

        {/* Multi-Post Campaign */}
        <button
          onClick={() => router.push(`/workspaces/${clientId}/create?mode=${isRE ? 'campaign' : 'assistant'}`)}
          className="flex items-center gap-4 p-5 rounded-2xl border border-white-10 bg-sp-card hover:border-purple-400/40 hover:bg-purple-400/5 transition-all group text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-400/15 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white-100">Multi-Post Campaign</p>
            <p className="text-xs text-white-40 mt-0.5">
              {isRE
                ? 'Turn a listing into a full campaign with scheduled posts across channels'
                : 'Create multiple coordinated posts around a theme or goal'}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-white-20 group-hover:text-purple-400 transition-colors flex-shrink-0" />
        </button>

        {/* AI Assistant */}
        <button
          onClick={() => router.push(`/workspaces/${clientId}/create?mode=assistant`)}
          className="flex items-center gap-4 p-5 rounded-2xl border border-white-10 bg-sp-card hover:border-blue-400/40 hover:bg-blue-400/5 transition-all group text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-400/15 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white-100">AI Assistant</p>
            <p className="text-xs text-white-40 mt-0.5">Walk through content creation step-by-step with the AI assistant</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white-20 group-hover:text-blue-400 transition-colors flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}
