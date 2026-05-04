'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  RefreshCw,
  Check,
  Save,
  Trash2,
  Loader2,
  ImagePlus,
  Video,
  X,
  AlertTriangle,
  Zap,
  Target,
  MessageCircle,
  Sparkles,
  Palette,
  Shuffle,
  FileText,
  LayoutList,
  Play,
  MessageSquare,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/apiFetch';
import {
  useUpdateDraft,
  useApproveDraft,
  useDeleteDraft,
  useGenerateMedia,
  useGenerateVideo,
  useRemixContent,
  useDraft,
  useAssets,
  type Draft,
  type ContentVariation,
  type ScoredHook,
  type RemixDraft,
  type MediaAsset,
  squadpitchKeys,
} from '@/hooks/useSquadpitch';
import { StatusBanner } from '@/components/common/StatusBanner';
import { getGenerationErrorInfo } from '@/lib/assistant/media/generationErrors';
import { checkPostQuality, type QualityWarning } from '@/lib/assistant/media/postQualityChecker';

interface Props {
  draft: Draft;
  clientId: string;
  /** Asset ID of an image generation kicked off before this component mounted */
  pendingAssetId?: string;
  onDiscard: () => void;
  onRegenerate: () => void;
}

interface VariationState {
  body: string;
  hooks: string[];
  hashtags: string[];
  cta: string | null;
}

export function ContentPreview({ draft: initialDraft, clientId, pendingAssetId, onDiscard, onRegenerate }: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  // Live draft data — falls back to prop for initial render, then stays in sync
  const { data: liveDraft } = useDraft(initialDraft.id);
  const draft = liveDraft ?? initialDraft;

  const updateDraft = useUpdateDraft(draft.id);
  const approve = useApproveDraft(draft.id);
  const deleteDraft = useDeleteDraft();
  const generateMedia = useGenerateMedia(clientId);
  const generateVideo = useGenerateVideo(clientId);
  const remix = useRemixContent(clientId);
  const [remixResults, setRemixResults] = useState<RemixDraft[] | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Query assets linked to this draft
  const { data: draftAssets } = useAssets(clientId, { draftId: draft.id, status: 'READY' });
  const attachedAssetIds = useMemo(
    () => (draftAssets ?? []).map((a: MediaAsset) => a.id),
    [draftAssets]
  );

  // Track the generating asset ID for polling (seed from auto-generation if provided)
  const [generatingAssetId, setGeneratingAssetId] = useState<string | null>(pendingAssetId ?? null);

  // Poll the asset every 3s while it's in progress
  const { data: generatingAsset } = useQuery({
    queryKey: squadpitchKeys.asset(generatingAssetId ?? ''),
    queryFn: () => apiFetch<MediaAsset>(`assets/${generatingAssetId}`),
    enabled: Boolean(generatingAssetId),
    refetchInterval: 3000,
  });

  // When asset reaches terminal state, stop polling and refresh the draft
  useEffect(() => {
    if (!generatingAsset) return;
    if (generatingAsset.status === 'READY' || generatingAsset.status === 'FAILED') {
      setGeneratingAssetId(null);
      qc.invalidateQueries({ queryKey: squadpitchKeys.draft(draft.id) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    }
  }, [generatingAsset, draft.id, qc]);

  const isGenerating = Boolean(generatingAssetId) || generateMedia.isPending || generateVideo.isPending;

  // Build all 3 variations (Version A from draft fields, B+C from variations array)
  const allVariations = useMemo<VariationState[]>(() => {
    const versionA: VariationState = {
      body: draft.body,
      hooks: draft.hooks ?? [],
      hashtags: draft.hashtags ?? [],
      cta: draft.cta,
    };
    const extras = (draft.variations ?? []).map((v: ContentVariation) => ({
      body: v.body ?? '',
      hooks: v.hooks ?? [],
      hashtags: v.hashtags ?? [],
      cta: v.cta ?? null,
    }));
    return [versionA, ...extras].slice(0, 3);
  }, [draft]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editedBody, setEditedBody] = useState(allVariations[0]?.body ?? '');
  const [editedCta, setEditedCta] = useState(allVariations[0]?.cta ?? '');
  const [editedHashtags, setEditedHashtags] = useState(
    allVariations[0]?.hashtags?.join(', ') ?? ''
  );
  const [hashtagInput, setHashtagInput] = useState('');

  const handleSelectVariation = (idx: number) => {
    setSelectedIdx(idx);
    const v = allVariations[idx];
    if (v) {
      setEditedBody(v.body);
      setEditedCta(v.cta ?? '');
      setEditedHashtags(v.hashtags.join(', '));
    }
  };

  const selectedVariation = allVariations[selectedIdx];
  const parsedHashtags = editedHashtags
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean);

  const handleApproveAndQueue = () => {
    const payload: Parameters<typeof updateDraft.mutate>[0] = {
      body: editedBody,
      cta: editedCta || undefined,
      hashtags: parsedHashtags,
      ...(attachedAssetIds.length > 0 && { mediaAssetIds: attachedAssetIds }),
    };
    updateDraft.mutate(payload, {
      onSuccess: () => {
        approve.mutate({
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
            const mediaCount = attachedAssetIds.length;
            setSaveStatus(mediaCount > 0 ? `Post approved with ${mediaCount} image(s) attached` : 'Post approved');
            router.push(`/workspaces/${clientId}/planner`);
          },
        });
      },
    });
  };

  const handleSaveAsDraft = () => {
    const payload: Parameters<typeof updateDraft.mutate>[0] = {
      body: editedBody,
      cta: editedCta || undefined,
      hashtags: parsedHashtags,
      ...(attachedAssetIds.length > 0 && { mediaAssetIds: attachedAssetIds }),
    };
    updateDraft.mutate(payload, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
        const mediaCount = attachedAssetIds.length;
        setSaveStatus(mediaCount > 0 ? `Post saved with ${mediaCount} image(s) attached` : 'Post saved as draft');
        router.push(`/workspaces/${clientId}/planner`);
      },
    });
  };

  const handleDiscard = () => {
    deleteDraft.mutate(draft.id, {
      onSuccess: () => onDiscard(),
    });
  };

  const handleGenerateImage = () => {
    generateMedia.mutate(
      {
        clientId,
        guidance: draft.imageGuidance || draft.altText || editedBody.slice(0, 500),
        draftId: draft.id,
        channel: draft.channel,
      },
      {
        onSuccess: (asset) => {
          setGeneratingAssetId(asset.id);
        },
      }
    );
  };

  const handleGenerateVideo = () => {
    generateVideo.mutate(
      {
        clientId,
        guidance: draft.imageGuidance || draft.altText || editedBody.slice(0, 500),
        draftId: draft.id,
        channel: draft.channel,
      },
      {
        onSuccess: (asset) => {
          setGeneratingAssetId(asset.id);
        },
      }
    );
  };

  const isSaving = updateDraft.isPending || approve.isPending;
  const anyError =
    (updateDraft.error as Error | null) ||
    (approve.error as Error | null) ||
    (deleteDraft.error as Error | null);

  const LABELS = ['Version A', 'Version B', 'Version C'];
  const VERSION_STYLES = ['Balanced', 'Professional', 'Engaging'];

  const CTA_PRESETS = [
    { label: 'DM me', value: 'DM me for details' },
    { label: 'Schedule showing', value: 'Schedule a showing — link in bio' },
    { label: 'Visit website', value: 'Visit our website for more info' },
  ];

  const MEDIA_STYLES = ['Luxury', 'Modern', 'Warm'] as const;

  // ── Post Strength score ────────────────────────────────────────────
  const postStrength = useMemo(() => {
    let score = 0;
    const reasons: string[] = [];

    // Hook quality (0-3) — use scored hooks if available
    const scored = draft.scoredHooks ?? [];
    const hooks = selectedVariation?.hooks ?? [];
    const bestHookScore = scored.length > 0 ? scored[0].hookScore : 0;
    if (scored.length > 0 && bestHookScore >= 8) { score += 3; reasons.push(`Strong hooks (best: ${bestHookScore}/10)`); }
    else if (scored.length > 0 && bestHookScore >= 6) { score += 2; reasons.push(`Decent hooks (best: ${bestHookScore}/10)`); }
    else if (hooks.length >= 3) { score += 3; reasons.push('Strong hook options'); }
    else if (hooks.length >= 1 || scored.length > 0) { score += 1; reasons.push('Hooks could be stronger'); }
    else { reasons.push('No hooks — consider adding an attention-grabber'); }

    // Body length and quality (0-3)
    const bodyLen = editedBody.trim().length;
    if (bodyLen >= 100 && bodyLen <= 2000) { score += 3; reasons.push('Good post length'); }
    else if (bodyLen >= 50) { score += 2; reasons.push('Decent length'); }
    else if (bodyLen > 0) { score += 1; reasons.push('Post is short — add more detail'); }

    // CTA presence (0-2)
    if (editedCta.trim()) { score += 2; reasons.push('CTA present'); }
    else { reasons.push('Missing CTA — add a call to action'); }

    // Hashtags (0-2)
    if (parsedHashtags.length >= 3 && parsedHashtags.length <= 15) { score += 2; reasons.push('Good hashtag count'); }
    else if (parsedHashtags.length >= 1) { score += 1; reasons.push('Few hashtags — add more'); }
    else { reasons.push('No hashtags'); }

    return { score, max: 10, reasons };
  }, [editedBody, editedCta, parsedHashtags, selectedVariation?.hooks]);

  // Quality warnings
  const qualityWarnings = useMemo<QualityWarning[]>(() => {
    return checkPostQuality({
      body: editedBody,
      cta: editedCta || null,
      hashtags: parsedHashtags,
      channel: draft.channel,
      hasMedia: Boolean(draft.mediaUrl),
    });
  }, [editedBody, editedCta, parsedHashtags, draft.channel, draft.mediaUrl]);

  // Determine what to show in the media section
  const mediaUrl = draft.mediaUrl;
  const mediaType = draft.mediaType;
  const progressStage = generatingAsset?.progressStage;
  const generationFailed = generatingAsset?.status === 'FAILED';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Confidence moment */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-green-110/8 border border-accent-green-110/15">
        <Check className="w-4 h-4 text-accent-green-110 flex-shrink-0" />
        <p className="text-sm text-white-80">
          <span className="font-semibold text-accent-green-110">Draft ready.</span>{' '}
          {allVariations.length > 1
            ? `${allVariations.length} variations generated — pick your favorite and approve.`
            : 'Review, edit if needed, then approve to publish.'}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white-100">Review your content</h1>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-white-10 text-white-60 text-xs font-medium">
            {draft.channel}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white-10 text-white-60 text-xs font-medium">
            {draft.kind}
          </span>
        </div>
      </div>

      {/* Variation selector cards */}
      {allVariations.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allVariations.map((v, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectVariation(idx)}
              className={cn(
                'card p-4 text-left transition-all',
                selectedIdx === idx
                  ? 'ring-2 ring-accent-green-110 bg-accent-green-110/5'
                  : 'hover:bg-white-5 opacity-70'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-semibold text-white-60 uppercase tracking-wider">
                    {LABELS[idx]}
                  </span>
                  <span className="ml-2 text-[10px] font-medium text-accent-green-110">
                    {VERSION_STYLES[idx]}
                  </span>
                </div>
                {selectedIdx === idx && (
                  <span className="w-5 h-5 rounded-full bg-accent-green-110 flex items-center justify-center">
                    <Check className="w-3 h-3 text-sp-surface" />
                  </span>
                )}
              </div>
              <p className="text-sm text-white-80 line-clamp-4">{v.body}</p>
              {v.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {v.hashtags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-[10px] text-white-40 font-mono">
                      #{tag}
                    </span>
                  ))}
                  {v.hashtags.length > 3 && (
                    <span className="text-[10px] text-white-30">
                      +{v.hashtags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Content editing */}
        <div className="lg:col-span-2 space-y-5">
          {/* Post Strength indicator */}
          <div className="card p-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-green-110" />
              <span className="text-xs font-medium text-white-40 uppercase tracking-wider">Post Strength</span>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 h-2 rounded-full bg-white-10 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    postStrength.score >= 8 ? 'bg-accent-green-110' : postStrength.score >= 5 ? 'bg-accent-orange' : 'bg-accent-red'
                  )}
                  style={{ width: `${(postStrength.score / postStrength.max) * 100}%` }}
                />
              </div>
              <span className={cn(
                'text-sm font-bold tabular-nums',
                postStrength.score >= 8 ? 'text-accent-green-110' : postStrength.score >= 5 ? 'text-accent-orange' : 'text-accent-red'
              )}>
                {postStrength.score}/{postStrength.max}
              </span>
            </div>
          </div>

          {/* Why This Works */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-green-110" />
              <span className="text-xs font-medium text-white-40 uppercase tracking-wider">Why this works</span>
            </div>
            <ul className="space-y-1">
              {postStrength.reasons.map((reason, i) => (
                <li key={i} className="text-xs text-white-60 flex items-center gap-1.5">
                  <span className={cn(
                    'w-1 h-1 rounded-full flex-shrink-0',
                    reason.includes('No ') || reason.includes('Missing') || reason.includes('short') || reason.includes('Few')
                      ? 'bg-accent-orange'
                      : 'bg-accent-green-110'
                  )} />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Quality warnings */}
          {qualityWarnings.length > 0 && (
            <div className="card p-4 space-y-1.5">
              {qualityWarnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1',
                    w.severity === 'error' ? 'bg-accent-red' : w.severity === 'warning' ? 'bg-accent-orange' : 'bg-white-30'
                  )} />
                  <span className={cn(
                    'text-xs',
                    w.severity === 'error' ? 'text-accent-red' : w.severity === 'warning' ? 'text-accent-orange' : 'text-white-40'
                  )}>
                    {w.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="card p-5 space-y-3">
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
              Post body {allVariations.length > 1 && `(${LABELS[selectedIdx]} — ${VERSION_STYLES[selectedIdx]})`}
            </label>
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={8}
              className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
            />
            <p className="text-xs text-white-30 text-right">
              {editedBody.length} characters
            </p>
          </div>

          {/* Scored Hooks — ranked by quality, click to apply */}
          {(() => {
            const scored = draft.scoredHooks ?? [];
            const fallback = selectedVariation?.hooks ?? [];
            const hasScored = scored.length > 0;
            const displayHooks = hasScored
              ? scored.slice(0, 5)
              : fallback.map((text, i) => ({ text, hookScore: 0, reason: '' } as ScoredHook));

            if (displayHooks.length === 0) return null;

            return (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
                    {hasScored ? 'Hooks — ranked by quality' : 'Hooks'}
                  </label>
                  <span className="text-[10px] text-white-30">Click to use as opening line</span>
                </div>
                <ul className="space-y-2">
                  {displayHooks.map((hook, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => {
                          const lines = editedBody.split('\n');
                          lines[0] = hook.text;
                          setEditedBody(lines.join('\n'));
                        }}
                        className="w-full text-left p-3 rounded-lg hover:bg-accent-green-110/5 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          {hasScored && (
                            <div className="flex flex-col items-center gap-1 min-w-[36px] pt-0.5">
                              <span className={cn(
                                'text-sm font-bold tabular-nums',
                                hook.hookScore >= 8 ? 'text-accent-green-110'
                                  : hook.hookScore >= 6 ? 'text-accent-orange'
                                  : 'text-white-40'
                              )}>
                                {hook.hookScore}
                              </span>
                              <div className="w-5 h-1 rounded-full bg-white-10 overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    hook.hookScore >= 8 ? 'bg-accent-green-110'
                                      : hook.hookScore >= 6 ? 'bg-accent-orange'
                                      : 'bg-white-30'
                                  )}
                                  style={{ width: `${hook.hookScore * 10}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {!hasScored && (
                            <span className="text-white-30 mt-0.5 group-hover:text-accent-green-110 min-w-[16px]">{i + 1}.</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-white-80 group-hover:text-accent-green-110 transition-colors">
                              {hook.text}
                            </span>
                            {hasScored && hook.reason && (
                              <p className="text-[11px] text-white-30 mt-0.5">{hook.reason}</p>
                            )}
                          </div>
                          <Zap className="w-3 h-3 text-white-20 group-hover:text-accent-green-110 flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* CTA with presets */}
          <div className="card p-5 space-y-3">
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
              Call to action
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CTA_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setEditedCta(preset.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1',
                    editedCta === preset.value
                      ? 'bg-accent-green-110 text-sp-surface'
                      : 'bg-white-10 text-white-60 hover:bg-white-20'
                  )}
                >
                  <MessageCircle className="w-3 h-3" />
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={editedCta}
              onChange={(e) => setEditedCta(e.target.value)}
              placeholder="e.g. Link in bio for more details"
              className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
            />
          </div>

          {/* Hashtags */}
          <div className="card p-5 space-y-3">
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
              Hashtags
            </label>
            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
              {parsedHashtags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white-10 text-white-80 text-xs font-mono"
                >
                  #{tag}
                  <button
                    onClick={() => {
                      const updated = parsedHashtags.filter((_, idx) => idx !== i);
                      setEditedHashtags(updated.join(', '));
                    }}
                    className="text-white-40 hover:text-white-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && hashtagInput.trim()) {
                  e.preventDefault();
                  const newTag = hashtagInput.trim().replace(/^#/, '');
                  if (newTag && !parsedHashtags.includes(newTag)) {
                    setEditedHashtags((prev) => (prev ? `${prev}, ${newTag}` : newTag));
                  }
                  setHashtagInput('');
                }
              }}
              placeholder="Type a hashtag and press Enter"
              className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
            />
          </div>
        </div>

        {/* Right column - Media + Remix */}
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
              Media
            </label>

            {/* Generating state — show progress */}
            {isGenerating && !mediaUrl && (
              <div className="aspect-square rounded-lg bg-white-5 border border-white-10 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-accent-green-110 animate-spin" />
                <p className="text-sm text-white-60 font-medium">
                  {progressStage || 'Starting generation...'}
                </p>
                <p className="text-xs text-white-30">This may take a moment</p>
              </div>
            )}

            {/* Generation failed — structured error display */}
            {generationFailed && !mediaUrl && (() => {
              const errorInfo = getGenerationErrorInfo(
                generatingAsset?.errorMessage
                  ? Object.assign(new Error(generatingAsset.errorMessage), {
                      code: (generatingAsset as any).errorCode ?? '',
                      status: 500,
                    })
                  : generateMedia.error ?? generateVideo.error
              );
              return (
                <div className="rounded-lg bg-accent-red/5 border border-accent-red/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-accent-red flex-shrink-0" />
                    <p className="text-sm text-accent-red font-medium">{errorInfo.title}</p>
                  </div>
                  <p className="text-xs text-white-40">{errorInfo.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {errorInfo.showRetry && (
                      <button
                        onClick={handleGenerateImage}
                        className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    )}
                    {errorInfo.fallbackOptions.map((opt) => (
                      <button
                        key={opt.action}
                        onClick={() => {
                          if (opt.action === 'continue') setGeneratingAssetId(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white-5 text-white-40 text-xs font-medium hover:bg-white-10 hover:text-white-60 transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Media ready */}
            {!isGenerating && !generationFailed && mediaUrl && (
              <div className="space-y-3">
                {mediaType === 'video' ? (
                  <video
                    src={mediaUrl}
                    controls
                    className="w-full rounded-lg"
                    poster={draft.mediaUrl ? undefined : undefined}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl}
                    alt="Attached media"
                    className="w-full rounded-lg object-cover"
                  />
                )}
              </div>
            )}

            {/* No media and not generating */}
            {!isGenerating && !generationFailed && !mediaUrl && (
              <div className="aspect-square rounded-lg bg-white-5 border border-dashed border-white-10 flex flex-col items-center justify-center gap-3">
                <ImagePlus className="w-8 h-8 text-white-20" />
                <p className="text-xs text-white-30">No media attached</p>
              </div>
            )}

            {/* Media style selector */}
            {mediaUrl && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-medium text-white-30 uppercase tracking-wider">Regenerate with style</span>
                <div className="flex gap-1.5">
                  {MEDIA_STYLES.map((style) => (
                    <button
                      key={style}
                      onClick={() => {
                        const styleGuidance = `${style.toLowerCase()} style: ${draft.imageGuidance || draft.altText || editedBody.slice(0, 500)}`;
                        generateMedia.mutate(
                          { clientId, guidance: styleGuidance, draftId: draft.id, channel: draft.channel },
                          { onSuccess: (asset) => setGeneratingAssetId(asset.id) }
                        );
                      }}
                      disabled={isGenerating}
                      className="flex-1 py-1.5 rounded-lg bg-white-5 text-white-60 text-[11px] font-medium hover:bg-white-10 hover:text-white-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Palette className="w-3 h-3" />
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleGenerateImage}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-lg bg-white-10 text-white-80 text-sm font-medium hover:bg-white-20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generateMedia.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                {mediaUrl ? 'Regenerate Image' : 'Generate Image'}
              </button>
              <button
                onClick={handleGenerateVideo}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-lg bg-white-10 text-white-80 text-sm font-medium hover:bg-white-20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generateVideo.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
                {mediaUrl ? 'Regenerate AI Video' : 'Generate AI Video'}
              </button>
            </div>

            {generateMedia.error && !generationFailed && (() => {
              const info = getGenerationErrorInfo(generateMedia.error);
              return (
                <div className="rounded-lg bg-accent-red/5 border border-accent-red/20 p-3 space-y-2">
                  <p className="text-xs text-accent-red font-medium">{info.title}</p>
                  <p className="text-[11px] text-white-40">{info.description}</p>
                  <div className="flex gap-2">
                    {info.showRetry && (
                      <button onClick={handleGenerateImage} className="text-[11px] text-white-60 hover:text-white-100">
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
            {generateVideo.error && !generationFailed && (() => {
              const info = getGenerationErrorInfo(generateVideo.error);
              return (
                <div className="rounded-lg bg-accent-red/5 border border-accent-red/20 p-3 space-y-2">
                  <p className="text-xs text-accent-red font-medium">{info.title}</p>
                  <p className="text-[11px] text-white-40">{info.description}</p>
                </div>
              );
            })()}
          </div>

          {/* Alt text */}
          {draft.altText && (
            <div className="card p-5 space-y-2">
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
                Alt text
              </label>
              <p className="text-xs text-white-60 italic">{draft.altText}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Remix — one idea into 4 formats */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-accent-green-110" />
            <span className="text-xs font-medium text-white-40 uppercase tracking-wider">Remix into formats</span>
          </div>
          {!remixResults && (
            <button
              onClick={() => {
                remix.mutate(draft.id, {
                  onSuccess: (data) => setRemixResults(data.drafts),
                });
              }}
              disabled={remix.isPending}
              className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {remix.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Shuffle className="w-3.5 h-3.5" />
              )}
              {remix.isPending ? 'Remixing...' : 'Remix this post'}
            </button>
          )}
          {remixResults && (
            <button
              onClick={() => setRemixResults(null)}
              className="text-xs text-white-40 hover:text-white-60 transition-colors"
            >
              Collapse
            </button>
          )}
        </div>

        {!remixResults && !remix.isPending && (
          <p className="text-xs text-white-30">
            Turn this post into a carousel, video script, and story caption — all from one idea.
          </p>
        )}

        {remix.error && (
          <p className="text-xs text-accent-red">{(remix.error as Error).message}</p>
        )}

        {remixResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {remixResults.map((rd) => {
              const FORMAT_META: Record<string, { label: string; icon: typeof FileText; desc: string }> = {
                post: { label: 'Post', icon: FileText, desc: 'Ready-to-publish' },
                carousel: { label: 'Carousel', icon: LayoutList, desc: 'Multi-slide' },
                videoScript: { label: 'Video Script', icon: Play, desc: '30-60s script' },
                storyCaption: { label: 'Story Caption', icon: MessageSquare, desc: 'Ultra-short' },
              };
              const meta = FORMAT_META[rd.remixFormat] ?? FORMAT_META.post;
              const Icon = meta.icon;

              return (
                <div key={rd.id} className="card p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-accent-green-110" />
                    <span className="text-xs font-semibold text-white-80">{meta.label}</span>
                    <span className="text-[10px] text-white-30">{meta.desc}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(rd.body)}
                      className="ml-auto p-1 rounded text-white-30 hover:text-white-80 transition-colors"
                      title="Copy"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-white-60 line-clamp-6 whitespace-pre-wrap">{rd.body}</p>
                  {rd.hooks.length > 0 && (
                    <p className="text-[10px] text-white-30 italic">Hook: {rd.hooks[0]}</p>
                  )}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="px-1.5 py-0.5 rounded-full bg-white-10 text-white-40 text-[10px]">{rd.kind}</span>
                    <span className="text-[10px] text-accent-green-110">Saved as draft</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save status */}
      {saveStatus && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-green-110/10 border border-accent-green-110/20">
          <Check className="w-3.5 h-3.5 text-accent-green-110" />
          <span className="text-xs text-white-80">{saveStatus}</span>
        </div>
      )}

      {/* Error banner */}
      {anyError && <StatusBanner error={anyError.message} />}

      {/* Action bar */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={onRegenerate}
          className="px-4 py-2.5 rounded-lg bg-white-10 text-white-80 text-sm font-medium hover:bg-white-20 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>

        <div className="flex-1" />

        <button
          onClick={handleDiscard}
          disabled={deleteDraft.isPending}
          className="px-4 py-2.5 rounded-lg text-white-40 text-sm font-medium hover:text-accent-red hover:bg-accent-red/10 transition-colors flex items-center gap-2"
        >
          {deleteDraft.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Discard
        </button>

        <button
          onClick={handleSaveAsDraft}
          disabled={isSaving}
          className="px-4 py-2.5 rounded-lg bg-white-10 text-white-80 text-sm font-medium hover:bg-white-20 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {updateDraft.isPending && !approve.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save as Draft
        </button>

        <button
          onClick={handleApproveAndQueue}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-lg bg-accent-green-110 text-sp-surface text-sm font-semibold hover:bg-accent-green-120 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {approve.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Approve & Queue
        </button>
      </div>
    </div>
  );
}
