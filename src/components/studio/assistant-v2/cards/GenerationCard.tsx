'use client';

import { useState, useMemo } from 'react';
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
  Target,
  Zap,
  MessageCircle,
  X,
  Save,
  ImageIcon,
  Plus,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGenerateListingCampaign,
  useGenerateContent,
  useUpdateDraft,
  useApproveDraft,
  useAssets,
  useGenerateMedia,
  useGenerateVideo,
  useMediaProfile,
  type Draft,
  type ContentVariation,
  type ScoredHook,
  type MediaAsset,
} from '@/hooks/useSquadpitch';
import { usePreferencesContext } from '@/hooks/useContentPreferences';
import { useUsage } from '@/hooks/useBilling';
import { mapSessionToCampaignInput, mapSessionToQuickPostInput } from '@/lib/assistant/conversation/sessionToGeneration';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { AssetPreviewModal } from './AssetPreviewModal';

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
            {slotCount} posts across {days} days on {channels.join(', ')}
          </p>
        )}
        <button
          onClick={handleGenerate}
          disabled={!session.propertyData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate Campaign
        </button>
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
    <QuickPostReview result={result} clientId={clientId} selectedMediaIds={session.selectedMediaIds} onRegenerate={() => { setResult(null); handleGenerate(); }} />
  );
}

// ── Quick Post Review (Enhanced) ────────────────────────────────────────

interface VariationState {
  body: string;
  hooks: string[];
  hashtags: string[];
  cta: string | null;
}

const CTA_PRESETS = [
  { label: 'DM me', value: 'DM me for details' },
  { label: 'Schedule showing', value: 'Schedule a showing — link in bio' },
  { label: 'Visit website', value: 'Visit our website for more info' },
];

function QuickPostReview({
  result,
  clientId,
  selectedMediaIds,
  onRegenerate,
}: {
  result: Draft | null;
  clientId: string;
  selectedMediaIds: string[];
  onRegenerate: () => void;
}) {
  if (!result) return null;

  return <QuickPostReviewInner draft={result} clientId={clientId} selectedMediaIds={selectedMediaIds} onRegenerate={onRegenerate} />;
}

function QuickPostReviewInner({
  draft,
  clientId,
  selectedMediaIds,
  onRegenerate,
}: {
  draft: Draft;
  clientId: string;
  selectedMediaIds: string[];
  onRegenerate: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const updateDraft = useUpdateDraft(draft.id);
  const approve = useApproveDraft(draft.id);
  const { data: assetsData } = useAssets(clientId, { status: 'READY' });
  const { data: mediaProfile } = useMediaProfile(clientId);
  const generateMedia = useGenerateMedia(clientId);
  const generateVideoMutation = useGenerateVideo(clientId);
  const { data: usage } = useUsage();

  const aiImageAvailable = mediaProfile?.mode === 'BRAND_ASSETS_PLUS_AI' || mediaProfile?.mode === 'AI_CHARACTER';
  const atImageLimit = !!(usage && isFinite(usage.limits.images) && usage.usage.images >= usage.limits.images);
  const atVideoLimit = !!(usage && isFinite(usage.limits.videos) && usage.usage.videos >= usage.limits.videos);

  const assetMap = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    for (const a of assetsData ?? []) map.set(a.id, a);
    return map;
  }, [assetsData]);

  // Filter synthetic IDs — they're context images, not attachable assets
  const [mediaIds, setMediaIds] = useState<string[]>(
    selectedMediaIds.filter((id) => !id.startsWith('property_img_') && !id.startsWith('item_img_'))
  );

  // Video generation presets
  const [videoPreset, setVideoPreset] = useState<string | undefined>(undefined);
  const [videoDuration, setVideoDuration] = useState<string>('5');

  const VIDEO_PRESET_OPTIONS = [
    { key: undefined as string | undefined, label: 'Auto' },
    { key: 'listing_walkthrough', label: 'Walkthrough' },
    { key: 'educational_tip', label: 'Edu Tip' },
    { key: 'brand_awareness', label: 'Brand' },
    { key: 'talking_head', label: 'Talking Head' },
  ];

  // Generate a single AI image/video and add to the media strip
  const handleGenerateAsset = (type: 'image' | 'video') => {
    const guidance = type === 'video'
      ? draft.videoGuidance || draft.imageGuidance || draft.altText || draft.body.slice(0, 500)
      : draft.imageGuidance || draft.altText || draft.body.slice(0, 500);
    if (type === 'image') {
      generateMedia.mutate(
        { clientId, guidance },
        {
          onSuccess: (asset) => {
            assetMap.set(asset.id, asset);
            setMediaIds((prev) => [...prev, asset.id]);
          },
        }
      );
    } else {
      generateVideoMutation.mutate(
        { clientId, guidance, preset: videoPreset, duration: videoDuration, channel: draft.channel },
        {
          onSuccess: (asset) => {
            assetMap.set(asset.id, asset);
            setMediaIds((prev) => [...prev, asset.id]);
          },
        }
      );
    }
  };
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  // Build all 3 variations
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

  const LABELS = ['Version A', 'Version B', 'Version C'];

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editedBody, setEditedBody] = useState(allVariations[0]?.body ?? '');
  const [editedCta, setEditedCta] = useState(allVariations[0]?.cta ?? '');
  const [editedHashtags, setEditedHashtags] = useState(
    allVariations[0]?.hashtags?.join(', ') ?? ''
  );
  const [hashtagInput, setHashtagInput] = useState('');
  const [copied, setCopied] = useState(false);

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

  // Post Strength score
  const postStrength = useMemo(() => {
    let score = 0;
    const reasons: string[] = [];

    const scored = draft.scoredHooks ?? [];
    const hooks = selectedVariation?.hooks ?? [];
    const bestHookScore = scored.length > 0 ? scored[0].hookScore : 0;
    if (scored.length > 0 && bestHookScore >= 8) { score += 3; reasons.push(`Strong hooks (best: ${bestHookScore}/10)`); }
    else if (scored.length > 0 && bestHookScore >= 6) { score += 2; reasons.push(`Decent hooks (best: ${bestHookScore}/10)`); }
    else if (hooks.length >= 3) { score += 3; reasons.push('Strong hook options'); }
    else if (hooks.length >= 1 || scored.length > 0) { score += 1; reasons.push('Hooks could be stronger'); }
    else { reasons.push('No hooks — consider adding an attention-grabber'); }

    const bodyLen = editedBody.trim().length;
    if (bodyLen >= 100 && bodyLen <= 2000) { score += 3; reasons.push('Good post length'); }
    else if (bodyLen >= 50) { score += 2; reasons.push('Decent length'); }
    else if (bodyLen > 0) { score += 1; reasons.push('Post is short — add more detail'); }

    if (editedCta.trim()) { score += 2; reasons.push('CTA present'); }
    else { reasons.push('Missing CTA — add a call to action'); }

    if (parsedHashtags.length >= 3 && parsedHashtags.length <= 15) { score += 2; reasons.push('Good hashtag count'); }
    else if (parsedHashtags.length >= 1) { score += 1; reasons.push('Few hashtags — add more'); }
    else { reasons.push('No hashtags'); }

    return { score, max: 10, reasons };
  }, [editedBody, editedCta, parsedHashtags, selectedVariation?.hooks, draft.scoredHooks]);

  const handleCopy = () => {
    const fullText = [
      editedBody,
      parsedHashtags.length ? parsedHashtags.map((h) => `#${h}`).join(' ') : '',
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isSaving = updateDraft.isPending || approve.isPending;

  const handleApproveAndQueue = () => {
    updateDraft.mutate(
      { body: editedBody, cta: editedCta || undefined, hashtags: parsedHashtags },
      {
        onSuccess: () => {
          approve.mutate({
            onSuccess: () => {
              qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
              router.push(`/workspaces/${clientId}/planner`);
            },
          });
        },
      }
    );
  };

  const handleSaveAsDraft = () => {
    updateDraft.mutate(
      { body: editedBody, cta: editedCta || undefined, hashtags: parsedHashtags },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
          router.push(`/workspaces/${clientId}/library`);
        },
      }
    );
  };

  // Sorted hooks
  const sortedHooks = useMemo(() => {
    const scored = draft.scoredHooks ?? [];
    if (scored.length > 0) return [...scored].sort((a, b) => b.hookScore - a.hookScore).slice(0, 5);
    const fallback = selectedVariation?.hooks ?? [];
    return fallback.map((text, i) => ({ text, hookScore: 0, reason: '' } as ScoredHook));
  }, [draft.scoredHooks, selectedVariation?.hooks]);

  return (
    <div className="space-y-3">
      {/* Version selector */}
      {allVariations.length > 1 && (
        <div className="flex gap-1.5">
          {allVariations.map((v, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectVariation(idx)}
              className={cn(
                'flex-1 p-2 rounded-lg text-left transition-all',
                selectedIdx === idx
                  ? 'bg-accent-green-110/10 border border-accent-green-110/30'
                  : 'bg-white-5 border border-white-10 opacity-60 hover:opacity-80'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-semibold text-white-60 uppercase">{LABELS[idx]}</span>
                {selectedIdx === idx && (
                  <Check className="w-3 h-3 text-accent-green-110" />
                )}
              </div>
              <p className="text-[11px] text-white-80 line-clamp-2">{v.body}</p>
            </button>
          ))}
        </div>
      )}

      {/* Media Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">
            Attached Media
          </label>
          <button
            onClick={() => setShowMediaPicker(!showMediaPicker)}
            className="text-[10px] text-accent-green-110 hover:underline"
          >
            {mediaIds.length > 0 ? 'Change' : 'Add media'}
          </button>
        </div>
        {mediaIds.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {mediaIds.map((id) => {
              const asset = assetMap.get(id);
              const thumb = asset?.assetType === 'video' ? (asset.thumbnailUrl || asset.url) : (asset?.url || asset?.thumbnailUrl);
              return (
                <div
                  key={id}
                  className="relative w-14 h-14 rounded-lg border border-white-10 bg-white-5 flex-shrink-0 overflow-hidden group"
                >
                  <button
                    type="button"
                    onClick={() => asset && setPreviewAsset(asset)}
                    className="w-full h-full"
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-white-20" />
                      </div>
                    )}
                    {asset?.assetType === 'video' && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 flex items-center justify-center py-0.5">
                        <Video className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => setMediaIds((prev) => prev.filter((mid) => mid !== id))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-white-30 italic">No media attached — add images or videos to your post</p>
        )}
        {showMediaPicker && (
          <QuickPostMediaPicker
            allAssets={assetsData ?? []}
            currentIds={mediaIds}
            onConfirm={(ids) => { setMediaIds(ids); setShowMediaPicker(false); }}
            onCancel={() => setShowMediaPicker(false)}
          />
        )}
        {/* AI Media Generation */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {aiImageAvailable && (
            <button
              onClick={() => handleGenerateAsset('image')}
              disabled={generateMedia.isPending || atImageLimit}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
                atImageLimit
                  ? 'opacity-50 cursor-not-allowed bg-white-5 text-white-40'
                  : 'bg-white-5 text-white-60 hover:bg-white-10 hover:text-white-100'
              )}
            >
              {generateMedia.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ImageIcon className="w-3 h-3" />
              )}
              {generateMedia.isPending ? 'Generating…' : 'Generate Image'}
              {atImageLimit && <span className="text-accent-red text-[9px] ml-0.5">Limit</span>}
            </button>
          )}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => handleGenerateAsset('video')}
              disabled={generateVideoMutation.isPending || atVideoLimit}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
                atVideoLimit
                  ? 'opacity-50 cursor-not-allowed bg-white-5 text-white-40'
                  : 'bg-white-5 text-white-60 hover:bg-white-10 hover:text-white-100'
              )}
            >
              {generateVideoMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Video className="w-3 h-3" />
              )}
              {generateVideoMutation.isPending ? 'Generating…' : 'Generate Video'}
              {atVideoLimit && <span className="text-accent-red text-[9px] ml-0.5">Limit</span>}
            </button>
            {/* Video preset chips */}
            <div className="flex gap-1 flex-wrap">
              {VIDEO_PRESET_OPTIONS.map((opt) => (
                <button
                  key={opt.key ?? 'auto'}
                  onClick={() => setVideoPreset(opt.key)}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
                    videoPreset === opt.key
                      ? 'bg-accent-green-110/20 text-accent-green-110'
                      : 'bg-white-5 text-white-30 hover:text-white-50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Duration toggle */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-white-30">Duration:</span>
              {['5', '10'].map((d) => (
                <button
                  key={d}
                  onClick={() => setVideoDuration(d)}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
                    videoDuration === d
                      ? 'bg-accent-green-110/20 text-accent-green-110'
                      : 'bg-white-5 text-white-30 hover:text-white-50'
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
          {generateMedia.isSuccess && (
            <span className="text-[10px] text-accent-green-110">Image added</span>
          )}
          {generateVideoMutation.isSuccess && (
            <span className="text-[10px] text-accent-green-110">Video added</span>
          )}
          {(generateMedia.isError || generateVideoMutation.isError) && (
            <span className="text-[10px] text-red-400">Generation failed</span>
          )}
        </div>
      </div>

      {/* Post Strength */}
      <div className="rounded-lg bg-white-5 border border-white-10 p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-accent-green-110" />
            <span className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Post Strength</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 h-1.5 rounded-full bg-white-10 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  postStrength.score >= 8 ? 'bg-accent-green-110' : postStrength.score >= 5 ? 'bg-accent-orange' : 'bg-accent-red'
                )}
                style={{ width: `${(postStrength.score / postStrength.max) * 100}%` }}
              />
            </div>
            <span className={cn(
              'text-xs font-bold tabular-nums',
              postStrength.score >= 8 ? 'text-accent-green-110' : postStrength.score >= 5 ? 'text-accent-orange' : 'text-accent-red'
            )}>
              {postStrength.score}/{postStrength.max}
            </span>
          </div>
        </div>
        <ul className="space-y-0.5">
          {postStrength.reasons.map((reason, i) => (
            <li key={i} className="text-[11px] text-white-60 flex items-center gap-1.5">
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

      {/* Post Body */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-medium text-white-40 uppercase tracking-wider">
          Post Body
        </label>
        <textarea
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-[13px] focus:outline-none focus:border-accent-green-110 resize-none leading-relaxed"
        />
        <p className="text-[10px] text-white-30 text-right">{editedBody.length} characters</p>
      </div>

      {/* Hooks — Ranked by Quality */}
      {sortedHooks.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">
              {draft.scoredHooks?.length ? 'Hooks — ranked by quality' : 'Hooks'}
            </label>
            <span className="text-[9px] text-white-30">Click to use as opening line</span>
          </div>
          <div className="space-y-1">
            {sortedHooks.map((hook, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const lines = editedBody.split('\n');
                  lines[0] = hook.text;
                  setEditedBody(lines.join('\n'));
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-accent-green-110/5 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  {draft.scoredHooks?.length ? (
                    <span className={cn(
                      'text-xs font-bold tabular-nums min-w-[20px] text-center',
                      hook.hookScore >= 8 ? 'text-accent-green-110'
                        : hook.hookScore >= 6 ? 'text-accent-orange'
                        : 'text-white-40'
                    )}>
                      {hook.hookScore}
                    </span>
                  ) : (
                    <span className="text-white-30 text-xs min-w-[20px] text-center">{i + 1}.</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-white-80 group-hover:text-accent-green-110 transition-colors">
                      {hook.text}
                    </span>
                    {hook.reason && (
                      <p className="text-[10px] text-white-30 mt-0.5">{hook.reason}</p>
                    )}
                  </div>
                  <Zap className="w-3 h-3 text-white-20 group-hover:text-accent-green-110 flex-shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">
          Call to Action
        </label>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {CTA_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setEditedCta(preset.value)}
              className={cn(
                'px-2 py-1 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1',
                editedCta === preset.value
                  ? 'bg-accent-green-110 text-sp-surface'
                  : 'bg-white-10 text-white-60 hover:bg-white-20'
              )}
            >
              <MessageCircle className="w-2.5 h-2.5" />
              {preset.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={editedCta}
          onChange={(e) => setEditedCta(e.target.value)}
          placeholder="e.g. Link in bio for more details"
          className="w-full px-2.5 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
        />
      </div>

      {/* Hashtags */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">
          Hashtags
        </label>
        <div className="flex flex-wrap gap-1 min-h-[24px]">
          {parsedHashtags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white-10 text-white-80 text-[11px] font-mono"
            >
              #{tag}
              <button
                onClick={() => {
                  const updated = parsedHashtags.filter((_, idx) => idx !== i);
                  setEditedHashtags(updated.join(', '));
                }}
                className="text-white-40 hover:text-white-100"
              >
                <X className="w-2.5 h-2.5" />
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
          className="w-full px-2.5 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-[11px] focus:outline-none focus:border-accent-green-110"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-60 hover:bg-white-20 hover:text-white-100 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-accent-green-110" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>

        <div className="flex-1" />

        {/* Turn into Video — generates video from draft text as guidance */}
        {!generateVideoMutation.isPending && !atVideoLimit && (
          <button
            onClick={() => handleGenerateAsset('video')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60 transition-colors"
          >
            <Video className="w-3 h-3" />
            Turn into Video
          </button>
        )}

        <button
          onClick={handleSaveAsDraft}
          disabled={isSaving}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-80 hover:bg-white-20 transition-colors disabled:opacity-50"
        >
          {updateDraft.isPending && !approve.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Save as Draft
        </button>

        <button
          onClick={handleApproveAndQueue}
          disabled={isSaving}
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

      {/* Asset preview modal */}
      {previewAsset && (
        <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
}

// ── Quick Post Media Picker ────────────���────────────────────────────────

function QuickPostMediaPicker({
  allAssets,
  currentIds,
  onConfirm,
  onCancel,
}: {
  allAssets: MediaAsset[];
  currentIds: string[];
  onConfirm: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set(currentIds));
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');

  const readyAssets = useMemo(() => {
    return allAssets
      .filter((a) => a.status === 'READY' && (a.url || a.thumbnailUrl))
      .filter((a) => filter === 'all' || a.assetType === filter);
  }, [allAssets, filter]);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="border border-white-10 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-white-40 uppercase tracking-wider">Select media</p>
        <div className="flex gap-1">
          {(['all', 'image', 'video'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
                filter === f
                  ? 'bg-accent-green-110/20 text-accent-green-110'
                  : 'text-white-30 hover:text-white-60'
              )}
            >
              {f === 'all' ? 'All' : f === 'image' ? 'Images' : 'Videos'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1 max-h-[120px] overflow-y-auto">
        {readyAssets.map((asset) => {
          const thumb = asset.assetType === 'video' ? (asset.thumbnailUrl || asset.url) : (asset.url || asset.thumbnailUrl);
          return (
            <button
              key={asset.id}
              onClick={() => toggle(asset.id)}
              className={cn(
                'relative aspect-square rounded border overflow-hidden transition-colors',
                picked.has(asset.id)
                  ? 'border-accent-green-110 ring-1 ring-accent-green-110/40'
                  : 'border-white-10 hover:border-white-20'
              )}
            >
              {thumb ? (
                <img src={thumb} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white-5 flex items-center justify-center">
                  <ImageIcon className="w-3 h-3 text-white-20" />
                </div>
              )}
              {asset.assetType === 'video' && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 flex items-center justify-center py-0.5">
                  <Video className="w-2 h-2 text-white" />
                </div>
              )}
              {picked.has(asset.id) && (
                <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-accent-green-110 flex items-center justify-center rounded-bl">
                  <Check className="w-2 h-2 text-sp-surface" />
                </div>
              )}
            </button>
          );
        })}
        {readyAssets.length === 0 && (
          <p className="col-span-6 text-[10px] text-white-30 text-center py-2">
            {filter === 'all' ? 'No media in library' : `No ${filter}s in library`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onConfirm(Array.from(picked))}
          className="text-[10px] font-medium text-accent-green-110 hover:underline"
        >
          Apply ({picked.size})
        </button>
        <button
          onClick={onCancel}
          className="text-[10px] text-white-40 hover:text-white-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
