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
  Film,
  Video,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/apiFetch';
import {
  useUpdateDraft,
  useApproveDraft,
  useDeleteDraft,
  useGenerateMedia,
  useGenerateVideo,
  useDraft,
  type Draft,
  type ContentVariation,
  type MediaAsset,
  squadpitchKeys,
} from '@/hooks/useSquadpitch';
import { StatusBanner } from '@/components/common/StatusBanner';

interface Props {
  draft: Draft;
  clientId: string;
  onDiscard: () => void;
  onRegenerate: () => void;
}

interface VariationState {
  body: string;
  hooks: string[];
  hashtags: string[];
  cta: string | null;
}

export function ContentPreview({ draft: initialDraft, clientId, onDiscard, onRegenerate }: Props) {
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

  // Track the generating asset ID for polling
  const [generatingAssetId, setGeneratingAssetId] = useState<string | null>(null);

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
    updateDraft.mutate(
      {
        body: editedBody,
        cta: editedCta || undefined,
        hashtags: parsedHashtags,
      },
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
      {
        body: editedBody,
        cta: editedCta || undefined,
        hashtags: parsedHashtags,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
          router.push(`/workspaces/${clientId}/library`);
        },
      }
    );
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

  // Determine what to show in the media section
  const mediaUrl = draft.mediaUrl;
  const mediaType = draft.mediaType;
  const progressStage = generatingAsset?.progressStage;
  const generationFailed = generatingAsset?.status === 'FAILED';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
                <span className="text-xs font-semibold text-white-60 uppercase tracking-wider">
                  {LABELS[idx]}
                </span>
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
          {/* Body */}
          <div className="card p-5 space-y-3">
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
              Post body {allVariations.length > 1 && `(${LABELS[selectedIdx]})`}
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

          {/* Hooks */}
          {selectedVariation?.hooks && selectedVariation.hooks.length > 0 && (
            <div className="card p-5 space-y-3">
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
                Hooks
              </label>
              <ul className="space-y-1.5">
                {selectedVariation.hooks.map((hook, i) => (
                  <li key={i} className="text-sm text-white-80 flex items-start gap-2">
                    <span className="text-white-30 mt-0.5">{i + 1}.</span>
                    {hook}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="card p-5 space-y-3">
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
              Call to action
            </label>
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

        {/* Right column - Media */}
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

            {/* Generation failed */}
            {generationFailed && !mediaUrl && (
              <div className="aspect-square rounded-lg bg-accent-red/5 border border-accent-red/20 flex flex-col items-center justify-center gap-3">
                <AlertTriangle className="w-8 h-8 text-accent-red" />
                <p className="text-sm text-accent-red font-medium">Generation failed</p>
                <p className="text-xs text-white-40">{generatingAsset?.errorMessage || 'Unknown error'}</p>
              </div>
            )}

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
                {mediaUrl ? 'Regenerate Video' : 'Generate Video'}
              </button>
            </div>

            {generateMedia.error && (
              <p className="text-xs text-accent-red">
                {(generateMedia.error as Error).message}
              </p>
            )}
            {generateVideo.error && (
              <p className="text-xs text-accent-red">
                {(generateVideo.error as Error).message}
              </p>
            )}
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
