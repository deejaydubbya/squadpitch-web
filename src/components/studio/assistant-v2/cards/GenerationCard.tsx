'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  Save,
} from 'lucide-react';
import {
  useGenerateListingCampaign,
  useGenerateContent,
  useUpdateDraft,
  useApproveDraft,
  useAssets,
  useMediaProfile,
  useDataItem,
  type Draft,
  type MediaAsset,
} from '@/hooks/useSquadpitch';
import { usePreferencesContext } from '@/hooks/useContentPreferences';
import { mapSessionToCampaignInput, mapSessionToQuickPostInput } from '@/lib/assistant/conversation/sessionToGeneration';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { AssetPreviewModal } from './AssetPreviewModal';
import { normalizeMediaIdsForSave } from '@/lib/assistant/media/normalizeMedia';
import { draftToNormalized } from '@/lib/assistant/normalizedPost.adapters';
import { PostEditorCard, PostMediaStrip, PostMediaSelector, MediaPlanBanner, usePostEditorState, useImproveAction, DataAwarenessBadge } from './post-editor';
import { usePostMediaGeneration } from './post-editor/usePostMediaGeneration';
import { buildMediaGuidance, type MediaImproveActionId } from '@/lib/assistant/improveActions';
import { PostMediaActions } from './PostMediaActions';
import { PersonaRecommendationBadge } from './PersonaRecommendationBadge';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

type Phase = 'ready' | 'generating' | 'complete' | 'error';

export function GenerationCard({ session, clientId, onSelection }: Props) {
  if (session.mode === 'quick_post') {
    return <QuickPostGeneration session={session} clientId={clientId} onSelection={onSelection} />;
  }
  return <CampaignGeneration session={session} clientId={clientId} onSelection={onSelection} />;
}

// ── Campaign Generation ──────────────────────────────────────────────────

function CampaignGeneration({ session, clientId, onSelection }: Props) {
  const generateMutation = useGenerateListingCampaign(clientId);
  const preferencesContext = usePreferencesContext(clientId);

  const [phase, setPhase] = useState<Phase>('ready');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    const input = mapSessionToCampaignInput(session, preferencesContext);
    if (!input) return;

    setPhase('generating');
    setError(null);

    generateMutation.mutate(
      input,
      {
        onSuccess: (data) => {
          setPhase('complete');
          // Dispatch to session — hook will transition to campaign_review card
          onSelection(
            { type: 'SET_GENERATION_RESULT', payload: data },
            'Campaign generated successfully'
          );
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Generation failed.');
          setPhase('error');
        },
      }
    );
  };

  if (phase === 'ready') {
    const slotCount = session.slots.length;
    const days = slotCount > 0 ? Math.max(...session.slots.map((s) => s.campaignDay)) : 0;
    const channels = Array.from(new Set(session.slots.map((s) => s.channel)));

    return (
      <div className="space-y-2">
        {slotCount > 0 && (
          <p className="text-[11px] text-white-40">
            {slotCount} connected posts across {days} days on {channels.join(', ')}
          </p>
        )}
        <button
          onClick={handleGenerate}
          disabled={!session.propertyData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={!session.propertyData ? 'Select a listing above to enable generation' : undefined}
        >
          <Sparkles className="w-4 h-4" />
          Generate Campaign
        </button>
        {!session.propertyData && (
          <p className="text-[10px] text-white-30">Select a listing above to enable generation</p>
        )}
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div className="flex items-center gap-3 py-3">
        <Loader2 className="w-5 h-5 text-accent-green-110 animate-spin" />
        <p className="text-xs text-white-60">Generating your campaign...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <p className="text-xs">{error}</p>
        </div>
        <button
          onClick={handleGenerate}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-100 hover:bg-white-20"
        >
          Retry
        </button>
      </div>
    );
  }

  // Complete — card is resolved, review card will appear next
  return (
    <div className="flex items-center gap-2 py-2">
      <CheckCircle2 className="w-4 h-4 text-accent-green-110" />
      <p className="text-xs text-white-60">Campaign generated — review below</p>
    </div>
  );
}

// ── Quick Post Generation ────────────────────────────────────────────────

function QuickPostGeneration({ session, clientId, onSelection }: Props) {
  const generateMutation = useGenerateContent();
  const preferencesContext = usePreferencesContext(clientId);

  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    // Map session state → generation input (state is source of truth)
    const input = mapSessionToQuickPostInput(session, clientId, preferencesContext);
    if (!input) return;

    setPhase('generating');
    setError(null);

    generateMutation.mutate(
      input,
      {
        onSuccess: (data) => {
          setResult(data);
          setPhase('complete');
          onSelection(
            { type: 'SET_GENERATION_RESULT', payload: data },
            'Post generated successfully'
          );
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Generation failed.');
          setPhase('error');
        },
      }
    );
  };

  if (phase === 'ready') {
    return (
      <div className="space-y-3">
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate Post
        </button>
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div className="flex items-center gap-3 py-3">
        <Loader2 className="w-5 h-5 text-accent-green-110 animate-spin" />
        <p className="text-xs text-white-60">Generating your post...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <p className="text-xs">{error}</p>
        </div>
        <button onClick={handleGenerate} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-100 hover:bg-white-20">
          Retry
        </button>
      </div>
    );
  }

  // Complete — inline review for quick post
  return (
    <QuickPostReview result={result} clientId={clientId} selectedMediaIds={session.selectedMediaIds} session={session} onRegenerate={() => { setResult(null); handleGenerate(); }} />
  );
}

// ── Quick Post Review (Enhanced) ────────────────────────────────────────

function QuickPostReview({
  result,
  clientId,
  selectedMediaIds,
  session,
  onRegenerate,
}: {
  result: Draft | null;
  clientId: string;
  selectedMediaIds: string[];
  session: AssistantSessionState;
  onRegenerate: () => void;
}) {
  if (!result) return null;

  return <QuickPostReviewInner draft={result} clientId={clientId} selectedMediaIds={selectedMediaIds} session={session} onRegenerate={onRegenerate} />;
}

function QuickPostReviewInner({
  draft,
  clientId,
  selectedMediaIds,
  session,
  onRegenerate,
}: {
  draft: Draft;
  clientId: string;
  selectedMediaIds: string[];
  session: AssistantSessionState;
  onRegenerate: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const updateDraft = useUpdateDraft(draft.id);
  const approve = useApproveDraft(draft.id);
  const { data: assetsData } = useAssets(clientId, { status: 'READY' });
  const { data: mediaProfile } = useMediaProfile(clientId);

  const aiAvailable = mediaProfile?.mode === 'BRAND_ASSETS_PLUS_AI' || mediaProfile?.mode === 'AI_CHARACTER';

  // Locally-generated assets that aren't yet in the query cache
  const [localAssets, setLocalAssets] = useState<Map<string, MediaAsset>>(new Map());

  const assetMap = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    for (const a of assetsData ?? []) map.set(a.id, a);
    localAssets.forEach((a, id) => map.set(id, a));
    return map;
  }, [assetsData, localAssets]);

  // Property images for synthetic ID resolution
  const propertyImages = useMemo(() => {
    const raw = session.propertyData?.images;
    return Array.isArray(raw) ? (raw as Array<string | { url?: string; src?: string; imageUrl?: string; label?: string }>) : [];
  }, [session.propertyData]);

  // Data item images for synthetic item_img_N resolution
  const { data: dataItem } = useDataItem(session.quickPostDataItemId ?? undefined);
  const itemImages = useMemo(() => {
    if (!dataItem) return [];
    const dataJson = dataItem.dataJson as Record<string, unknown> | undefined;
    const imgs = Array.isArray(dataJson?.images) ? (dataJson.images as string[]) : [];
    return imgs;
  }, [dataItem]);

  // ── Normalized post + shared editor state ──────────────────────────
  const normalizedPost = useMemo(() => draftToNormalized(draft), [draft]);
  const editor = usePostEditorState(normalizedPost);

  // ── AI Improve actions ─────────────────────────────────────────────
  const improveAction = useImproveAction({
    clientId,
    channel: draft.channel,
    kind: draft.kind,
    currentBody: editor.editedBody,
    currentCta: editor.editedCta || null,
    currentHashtags: editor.parsedHashtags,
    propertyAddress: session.propertyData?.address as string | undefined,
    onVersionCreated: editor.addVersion,
    onLoading: editor.setImproveLoading,
    onError: editor.setImproveError,
    onComplete: editor.clearImproveState,
  });

  const mediaGen = usePostMediaGeneration({
    clientId,
    onAssetReady: (asset) => {
      setMediaIds((prev) => [...prev, asset.id]);
      setLocalAssets((prev) => new Map(prev).set(asset.id, asset));
    },
  });

  const handleMediaImprove = (actionId: MediaImproveActionId) => {
    const guidance = buildMediaGuidance(editor.editedBody, draft.channel);
    if (actionId === 'generate_matching_image') {
      mediaGen.generateImage(guidance);
    } else {
      mediaGen.generateVideo(guidance, undefined, undefined, draft.channel);
    }
  };

  // ── Persona recommendation ──────────────────────────────────────────
  const [personaDismissed, setPersonaDismissed] = useState(false);
  const autoAppliedRef = useRef(false);

  useEffect(() => {
    if (draft.personaRecommendation?.autoApply && !autoAppliedRef.current) {
      autoAppliedRef.current = true;
      mediaGen.generateImageWithPersona(draft.imageGuidance || draft.body);
      setPersonaDismissed(true);
    }
  }, [draft.personaRecommendation]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasUserEdits = editor.editedBody !== (editor.selectedVersion?.body ?? '');

  // Preserve all selected IDs including synthetic ones — they'll be converted before save
  const [mediaIds, setMediaIds] = useState<string[]>(selectedMediaIds);

  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const fullText = [
      editor.editedBody,
      editor.parsedHashtags.length ? editor.parsedHashtags.map((h) => `#${h}`).join(' ') : '',
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isSaving = updateDraft.isPending || approve.isPending;
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizeError, setNormalizeError] = useState<string | null>(null);

  const executeSaveWithNormalize = async (mode: 'draft' | 'approve') => {
    setNormalizeError(null);

    const idsToSave = mediaIds.slice(0, 6);
    const hasSynthetic = idsToSave.some((id) => id.startsWith('item_img_') || id.startsWith('property_img_'));

    let finalAssetIds: string[] = [];
    if (idsToSave.length > 0) {
      if (hasSynthetic) {
        setIsNormalizing(true);
        try {
          const result = await normalizeMediaIdsForSave({
            clientId,
            ids: idsToSave,
            propertyImages: propertyImages as Array<string | { url?: string; label?: string }>,
            itemImages: itemImages as Array<string | { url?: string; label?: string }>,
          });
          finalAssetIds = result.realIds;
          if (finalAssetIds.length === 0 && result.errors.length > 0) {
            setNormalizeError('Could not convert listing images. Try choosing from your media library instead.');
            setIsNormalizing(false);
            return;
          }
        } catch (err) {
          console.error('[QP SAVE] Normalize failed:', err);
          setNormalizeError(err instanceof Error ? err.message : 'Image conversion failed');
          setIsNormalizing(false);
          return;
        }
        setIsNormalizing(false);
      } else {
        finalAssetIds = idsToSave;
      }
    }

    const payload: Parameters<typeof updateDraft.mutate>[0] = {
      body: editor.editedBody,
      cta: editor.editedCta || undefined,
      hashtags: editor.parsedHashtags,
      ...(finalAssetIds.length > 0 && { mediaAssetIds: finalAssetIds }),
    };

    try {
      await updateDraft.mutateAsync(payload);

      if (mode === 'approve') {
        await approve.mutateAsync({});
        qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
        setSaveStatus('Post approved');
        router.push(`/workspaces/${clientId}/planner`);
      } else {
        qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
        setSaveStatus('Post saved as draft');
        router.push(`/workspaces/${clientId}/library`);
      }
    } catch (err) {
      console.error('[QP SAVE] Failed:', err);
      setNormalizeError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleApproveAndQueue = () => executeSaveWithNormalize('approve');
  const handleSaveAsDraft = () => executeSaveWithNormalize('draft');

  return (
    <div className="space-y-3">
      {/* Shared post editor: version selector, score, body, hooks, CTA, hashtags */}
      <PostEditorCard
        normalizedPost={{ ...normalizedPost, versions: editor.versions, selectedVersionId: editor.selectedVersionId }}
        bestVersionId={editor.bestVersionId}
        editedBody={editor.editedBody}
        editedCta={editor.editedCta}
        editedHashtags={editor.editedHashtags}
        onBodyChange={editor.setEditedBody}
        onCtaChange={editor.setEditedCta}
        onHashtagsChange={editor.setEditedHashtags}
        onSelectVersion={editor.handleSelectVersion}
        score={editor.postStrength}
        hooks={editor.sortedHooks}
        hasScored={editor.hasScored}
        onUseHook={editor.useHookAsOpeningLine}
        improveState={editor.improveState}
        onTextImprove={improveAction.executeTextAction}
        onMediaImprove={handleMediaImprove}
        onDismissImproveError={editor.clearImproveState}
        hasUserEdits={hasUserEdits}
        atImageLimit={mediaGen.atImageLimit}
        atVideoLimit={mediaGen.atVideoLimit}
      />

      {/* Data awareness badge */}
      {normalizedPost.dataAwareness && (
        <DataAwarenessBadge awareness={normalizedPost.dataAwareness} showDetail={true} />
      )}

      {/* Media Plan Banner */}
      {draft.mediaPlan && (
        <MediaPlanBanner
          mediaPlan={draft.mediaPlan}
          onOpenGenerate={() => setShowMediaPicker(true)}
        />
      )}

      {/* Persona recommendation badge */}
      {draft.personaRecommendation && !personaDismissed && (
        <PersonaRecommendationBadge
          recommendation={draft.personaRecommendation}
          isApplying={mediaGen.isGeneratingImage}
          onUsePersona={() => {
            mediaGen.generateImageWithPersona(draft.imageGuidance || draft.body);
            setPersonaDismissed(true);
          }}
          onSkip={() => setPersonaDismissed(true)}
        />
      )}

      {/* Media Strip */}
      <PostMediaStrip
        mediaIds={mediaIds}
        assetMap={assetMap}
        propertyImages={propertyImages}
        itemImages={itemImages}
        onRemove={(id) => setMediaIds((prev) => prev.filter((mid) => mid !== id))}
        onPreview={(asset) => setPreviewAsset(asset)}
        onTogglePicker={() => setShowMediaPicker(!showMediaPicker)}
      />
      {showMediaPicker && (
        <PostMediaSelector
          clientId={clientId}
          mediaIds={mediaIds}
          onMediaChange={(ids) => { setMediaIds(ids); setShowMediaPicker(false); }}
          assetMap={assetMap}
          propertyImages={propertyImages}
          itemImages={itemImages}
          sessionSelectedMediaIds={selectedMediaIds}
          aiAvailable={aiAvailable}
          defaultGuidance={draft.mediaPlan?.prompt || draft.imageGuidance || draft.altText || draft.body.slice(0, 500)}
          onLocalAssetAdded={(asset) => setLocalAssets((prev) => new Map(prev).set(asset.id, asset))}
          onClose={() => setShowMediaPicker(false)}
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-60 hover:bg-white-20 hover:text-white-100 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate
        </button>

        <PostMediaActions
          mediaIds={mediaIds}
          assetMap={assetMap}
          propertyImages={propertyImages as any}
          itemImages={itemImages as any}
          body={editor.editedBody}
          cta={editor.editedCta || null}
          channel={draft.channel}
          clientId={clientId}
          onVideoAttached={(asset) => setMediaIds([asset.id])}
          onLocalAssetAdded={(asset) => setLocalAssets((prev) => new Map(prev).set(asset.id, asset))}
          variant="padded"
          copyText={[
            editor.editedBody,
            editor.parsedHashtags.length ? editor.parsedHashtags.map((h: string) => `#${h}`).join(' ') : '',
          ].filter(Boolean).join('\n\n')}
        />

        <div className="flex-1" />

        <button
          onClick={handleSaveAsDraft}
          disabled={isSaving || isNormalizing}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-80 hover:bg-white-20 transition-colors disabled:opacity-50"
        >
          {(updateDraft.isPending && !approve.isPending) || isNormalizing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          {isNormalizing ? 'Converting images...' : 'Save as Draft'}
        </button>

        <button
          onClick={handleApproveAndQueue}
          disabled={isSaving || isNormalizing}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-surface hover:bg-accent-green-110/90 transition-colors disabled:opacity-50"
        >
          {approve.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          Approve & Queue
        </button>
      </div>

      {/* Save status */}
      {saveStatus && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent-green-110/10 border border-accent-green-110/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-accent-green-110 flex-shrink-0" />
          <span className="text-[11px] text-white-80">{saveStatus}</span>
        </div>
      )}

      {/* Normalize error */}
      {normalizeError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent-red/10 border border-accent-red/20">
          <AlertCircle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />
          <span className="text-[11px] text-accent-red">{normalizeError}</span>
        </div>
      )}

      {/* Error states */}
      {updateDraft.isError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent-red/10 border border-accent-red/20">
          <AlertCircle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />
          <span className="text-[11px] text-accent-red">{(updateDraft.error as Error).message}</span>
        </div>
      )}

      {/* Asset preview modal */}
      {previewAsset && (
        <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
}
