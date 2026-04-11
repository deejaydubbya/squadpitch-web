'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import {
  useUpdateDraft,
  useApproveDraft,
  useDeleteDraft,
  useGenerateContent,
  useGenerateMedia,
  useGenerateVideo,
  type Draft,
} from '@/hooks/useSquadpitch';
import { StatusBanner } from '@/components/common/StatusBanner';

interface Props {
  draft: Draft;
  clientId: string;
  onDiscard: () => void;
  onRegenerate: () => void;
}

export function ContentPreview({ draft, clientId, onDiscard, onRegenerate }: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  const updateDraft = useUpdateDraft(draft.id);
  const approve = useApproveDraft(draft.id);
  const deleteDraft = useDeleteDraft();
  const generateMedia = useGenerateMedia(clientId);
  const generateVideo = useGenerateVideo(clientId);

  const [body, setBody] = useState(draft.body);
  const [cta, setCta] = useState(draft.cta ?? '');
  const [hashtags, setHashtags] = useState(draft.hashtags?.join(', ') ?? '');
  const [hashtagInput, setHashtagInput] = useState('');

  const parsedHashtags = hashtags
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean);

  const handleApproveAndQueue = () => {
    // Save edits first, then approve
    updateDraft.mutate(
      {
        body,
        cta: cta || undefined,
        hashtags: parsedHashtags,
      },
      {
        onSuccess: () => {
          approve.mutate({
            onSuccess: () => {
              qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
              router.push(`/clients/${clientId}/planner`);
            },
          });
        },
      }
    );
  };

  const handleSaveAsDraft = () => {
    updateDraft.mutate(
      {
        body,
        cta: cta || undefined,
        hashtags: parsedHashtags,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
          router.push(`/clients/${clientId}/library`);
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
        guidance: draft.imageGuidance || draft.altText || draft.body.slice(0, 500),
        draftId: draft.id,
        channel: draft.channel,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
        },
      }
    );
  };

  const handleGenerateVideo = () => {
    generateVideo.mutate(
      {
        clientId,
        guidance: draft.imageGuidance || draft.altText || draft.body.slice(0, 500),
        draftId: draft.id,
        channel: draft.channel,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
        },
      }
    );
  };

  const isSaving = updateDraft.isPending || approve.isPending;
  const anyError =
    (updateDraft.error as Error | null) ||
    (approve.error as Error | null) ||
    (deleteDraft.error as Error | null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Content editing */}
        <div className="lg:col-span-2 space-y-5">
          {/* Body */}
          <div className="card p-5 space-y-3">
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
              Post body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
            />
            <p className="text-xs text-white-30 text-right">
              {body.length} characters
            </p>
          </div>

          {/* Hooks */}
          {draft.hooks && draft.hooks.length > 0 && (
            <div className="card p-5 space-y-3">
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
                Hooks
              </label>
              <ul className="space-y-1.5">
                {draft.hooks.map((hook, i) => (
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
              value={cta}
              onChange={(e) => setCta(e.target.value)}
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
                      setHashtags(updated.join(', '));
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
                    setHashtags((prev) => (prev ? `${prev}, ${newTag}` : newTag));
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
            {draft.mediaUrl ? (
              <div className="space-y-3">
                {draft.mediaType === 'video' ? (
                  <div className="aspect-square rounded-lg bg-white-5 flex items-center justify-center">
                    <Film className="w-8 h-8 text-white-30" />
                  </div>
                ) : (
                  <img
                    src={draft.mediaUrl}
                    alt="Attached media"
                    className="w-full rounded-lg object-cover"
                  />
                )}
              </div>
            ) : (
              <div className="aspect-square rounded-lg bg-white-5 border border-dashed border-white-10 flex flex-col items-center justify-center gap-3">
                <ImagePlus className="w-8 h-8 text-white-20" />
                <p className="text-xs text-white-30">No media attached</p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleGenerateImage}
                disabled={generateMedia.isPending}
                className="w-full py-2.5 rounded-lg bg-white-10 text-white-80 text-sm font-medium hover:bg-white-20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generateMedia.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                Generate Image
              </button>
              <button
                onClick={handleGenerateVideo}
                disabled={generateVideo.isPending}
                className="w-full py-2.5 rounded-lg bg-white-10 text-white-80 text-sm font-medium hover:bg-white-20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generateVideo.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
                Generate Video
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
