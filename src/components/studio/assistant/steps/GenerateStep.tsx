'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGenerateListingCampaign,
  useGenerateContent,
  useSaveCampaignDrafts,
  type ListingCampaignResult,
  type CampaignType,
  type Draft,
} from '@/hooks/useSquadpitch';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { usePreferencesContext } from '@/hooks/useContentPreferences';
import { useIndustryTerminology } from '@/hooks/useIndustryTerminology';

interface Props {
  session: AssistantSessionState;
  dispatch: React.Dispatch<AssistantAction>;
  clientId: string;
}

type Phase = 'ready' | 'generating' | 'complete' | 'error';

// ── Quick Post Generate ─────────────────────────────────────────────────

function buildQuickPostGuidance(session: AssistantSessionState, preferencesContext?: string | null, itemLabel?: string): string {
  const parts: string[] = [];

  if (session.propertyData) {
    const address = session.propertyData.address as string | undefined;
    const price = session.propertyData.price as string | undefined;
    const label = itemLabel ?? 'Property';
    if (address) parts.push(`${label}: ${address}`);
    if (price) parts.push(`Price: ${price}`);
  }

  if (session.quickPostGuidance) {
    parts.push(session.quickPostGuidance);
  }

  // Inject persistent preferences as context hints
  if (preferencesContext) {
    parts.push(preferencesContext);
  }

  return parts.length > 0 ? parts.join('\n') : 'Create an engaging post';
}

function QuickPostGenerate({ session, dispatch, clientId }: Props) {
  const generateMutation = useGenerateContent();
  const preferencesContext = usePreferencesContext(clientId);
  const t = useIndustryTerminology(session.industryKey);

  const [phase, setPhase] = useState<Phase>(session.generationResult ? 'complete' : 'ready');
  const [result, setResult] = useState<Draft | null>(
    session.generationResult as Draft | null
  );
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!session.quickPostChannel) return;

    setPhase('generating');
    setError(null);

    generateMutation.mutate(
      {
        clientId,
        kind: session.quickPostKind,
        channel: session.quickPostChannel,
        guidance: buildQuickPostGuidance(session, preferencesContext, t.itemSingular.charAt(0).toUpperCase() + t.itemSingular.slice(1)),
        dataItemId: session.selectedPropertyId ?? undefined,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          setPhase('complete');
          dispatch({ type: 'SET_GENERATION_RESULT', payload: data });
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
          setPhase('error');
        },
      }
    );
  };

  // ── Ready state ──
  if (phase === 'ready') {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-lg border border-white-10 p-4">
          <p className="text-xs font-medium text-white-40 uppercase tracking-wider mb-3">Summary</p>
          <div className="space-y-2 text-sm text-white-100">
            <p>
              <span className="text-white-40">Channel:</span>{' '}
              {CHANNEL_REGISTRY[session.quickPostChannel!]?.label ?? session.quickPostChannel}
            </p>
            <p>
              <span className="text-white-40">Kind:</span>{' '}
              {session.quickPostKind.replace(/_/g, ' ').toLowerCase()}
            </p>
            {session.quickPostGuidance && (
              <p>
                <span className="text-white-40">Guidance:</span>{' '}
                <span className="text-white-60">{session.quickPostGuidance}</span>
              </p>
            )}
            {session.selectedPropertyId && (
              <p>
                <span className="text-white-40">{t.itemSingular.charAt(0).toUpperCase() + t.itemSingular.slice(1)}:</span>{' '}
                {(session.propertyData?.address as string) ?? 'Selected'}
              </p>
            )}
          </div>
          {session.quickPostChannel && CHANNEL_REGISTRY[session.quickPostChannel]?.requiresMedia && session.selectedMediaIds.length === 0 && (
            <p className="text-xs text-yellow-200/80 mt-2">
              Note: {CHANNEL_REGISTRY[session.quickPostChannel].label} requires media. You can attach images after generation.
            </p>
          )}
        </div>

        <button
          onClick={handleGenerate}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate Post
        </button>
      </div>
    );
  }

  // ── Generating state ──
  if (phase === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4">
        <Loader2 className="w-8 h-8 text-accent-green-110 animate-spin" />
        <p className="text-sm text-white-60">Generating your post...</p>
      </div>
    );
  }

  // ── Error state ──
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={handleGenerate}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white-10 text-white-100 hover:bg-white-20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Complete state ──
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-accent-green-110" />
        <p className="text-sm font-medium text-white-100">Post generated</p>
      </div>

      {result && (
        <div className="rounded-lg border border-white-10 p-4 space-y-3">
          <p className="text-sm text-white-100 whitespace-pre-wrap">{result.body}</p>

          {result.hooks && result.hooks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white-40 mb-1">Hooks</p>
              <ul className="space-y-1">
                {result.hooks.map((hook, i) => (
                  <li key={i} className="text-xs text-white-60">• {hook}</li>
                ))}
              </ul>
            </div>
          )}

          {result.hashtags && result.hashtags.length > 0 && (
            <p className="text-xs text-accent-green-110">
              {result.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link
          href={`/workspaces/${clientId}/content`}
          className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
        >
          View in Content Library
        </Link>
        <button
          onClick={() => {
            setPhase('ready');
            setResult(null);
            dispatch({ type: 'SET_GENERATION_RESULT', payload: null });
          }}
          className="px-4 py-3 rounded-lg text-sm font-medium text-white-60 hover:bg-white-5 transition-colors"
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}

// ── Campaign Generate ───────────────────────────────────────────────────

export function GenerateStep({ session, dispatch, clientId }: Props) {
  if (session.mode === 'quick_post') {
    return <QuickPostGenerate session={session} dispatch={dispatch} clientId={clientId} />;
  }
  const generateMutation = useGenerateListingCampaign(clientId);
  const saveMutation = useSaveCampaignDrafts(clientId);
  const preferencesContext = usePreferencesContext(clientId);

  const [phase, setPhase] = useState<Phase>(session.generationResult ? 'complete' : 'ready');
  const [result, setResult] = useState<ListingCampaignResult | null>(
    session.generationResult as ListingCampaignResult | null
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleGenerate = () => {
    if (!session.propertyData) return;

    setPhase('generating');
    setError(null);

    generateMutation.mutate(
      {
        propertyData: session.propertyData,
        campaignType: (session.campaignType as CampaignType) ?? undefined,
        slots: session.slots.map((s) => ({
          label: s.label ?? '',
          channel: s.channel,
          campaignDay: s.campaignDay,
          slotType: s.slotType,
          angle: s.angle,
        })),
        preferencesContext: preferencesContext ?? undefined,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          setPhase('complete');
          dispatch({ type: 'SET_GENERATION_RESULT', payload: data });
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
          setPhase('error');
        },
      }
    );
  };

  const handleSave = () => {
    if (!result || !session.propertyData) return;

    saveMutation.mutate(
      {
        campaign: result.campaign,
        propertyData: session.propertyData,
        campaignType: (session.campaignType as CampaignType) ?? undefined,
        dataItemId: result.dataItemId,
        addToPlanner: true,
        mediaAssetIds: session.selectedMediaIds.length > 0 ? session.selectedMediaIds : undefined,
      },
      {
        onSuccess: () => {
          setSaved(true);
        },
        onError: () => {
          // Error toast handled by mutation defaults or we show inline
        },
      }
    );
  };

  // ── Ready state ──
  if (phase === 'ready') {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-lg border border-white-10 p-4">
          <p className="text-xs font-medium text-white-40 uppercase tracking-wider mb-3">Summary</p>
          <div className="space-y-2 text-sm text-white-100">
            {session.campaignType && (
              <p>
                <span className="text-white-40">Type:</span>{' '}
                {session.campaignType.replace(/_/g, ' ')}
              </p>
            )}
            <p>
              <span className="text-white-40">Channels:</span>{' '}
              {session.channels.map((ch) => CHANNEL_REGISTRY[ch]?.label ?? ch).join(', ') || 'None'}
            </p>
            <p>
              <span className="text-white-40">Posts:</span> {session.slots.length}
            </p>
            {session.selectedMediaIds.length > 0 && (
              <p>
                <span className="text-white-40">Images:</span> {session.selectedMediaIds.length}
              </p>
            )}
          </div>
          {session.channels.some((ch) => CHANNEL_REGISTRY[ch]?.requiresMedia) && session.selectedMediaIds.length === 0 && (
            <p className="text-xs text-yellow-200/80 mt-2">
              Note: Some channels require media. You can attach images after generation.
            </p>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={!session.propertyData}
          className={cn(
            'flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-colors',
            session.propertyData
              ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90'
              : 'bg-white-10 text-white-40 cursor-not-allowed'
          )}
        >
          <Sparkles className="w-4 h-4" />
          Generate Campaign
        </button>
      </div>
    );
  }

  // ── Generating state ──
  if (phase === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4">
        <Loader2 className="w-8 h-8 text-accent-green-110 animate-spin" />
        <p className="text-sm text-white-60">Generating your campaign...</p>
      </div>
    );
  }

  // ── Error state ──
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={handleGenerate}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white-10 text-white-100 hover:bg-white-20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Complete state ──
  return (
    <div className="flex flex-col gap-5">
      {/* Campaign info */}
      {result?.campaign && (
        <>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent-green-110" />
            <p className="text-sm font-medium text-white-100">{result.campaign.campaignName}</p>
          </div>

          {/* Post list */}
          <div className="rounded-lg border border-white-10 divide-y divide-white-5 max-h-[280px] overflow-y-auto">
            {result.campaign.posts.map((post, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-medium text-accent-green-110">
                    Day {post.campaignDay}
                  </span>
                  <span className="text-[11px] text-white-40">
                    {CHANNEL_REGISTRY[post.channel]?.label ?? post.channel}
                  </span>
                </div>
                <p className="text-xs text-white-60 line-clamp-2">{post.body}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Save / Success */}
      {saved ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-accent-green-110/10 border border-accent-green-110/20">
          <CheckCircle2 className="w-5 h-5 text-accent-green-110 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white-100">Saved to Planner</p>
            <Link
              href={`/workspaces/${clientId}/planner`}
              className="text-xs text-accent-green-110 hover:underline"
            >
              View in Planner
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-colors',
              saveMutation.isPending
                ? 'bg-white-10 text-white-40 cursor-not-allowed'
                : 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90'
            )}
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save to Planner
          </button>
          <button
            onClick={() => {
              setPhase('ready');
              setResult(null);
              dispatch({ type: 'SET_GENERATION_RESULT', payload: null });
            }}
            className="px-4 py-3 rounded-lg text-sm font-medium text-white-60 hover:bg-white-5 transition-colors"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
