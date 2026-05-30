'use client';

import { useState } from 'react';
import { X, MessageCircle, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

import { VersionPicker } from './VersionPicker';
import { PostScoreMeter } from './PostScoreMeter';
import { HooksRanking } from './HooksRanking';
import { ImproveMenu } from './ImproveMenu';
import { CTA_PRESETS } from './constants';
import type { PostEditorCardProps } from './types';
import { getLanguageLabel } from '@/lib/languages';

/**
 * Composed post-editor UI: version selector, post strength meter, body
 * textarea, hooks ranking, CTA editor, and hashtags editor.
 *
 * Used by both QuickPostReviewInner and PostReviewItem.
 */
export function PostEditorCard({
  normalizedPost,
  bestVersionId,
  editedBody,
  editedCta,
  editedHashtags,
  onBodyChange,
  onCtaChange,
  onHashtagsChange,
  onSelectVersion,
  score,
  hooks,
  hasScored,
  onUseHook,
  improveState,
  onTextImprove,
  onMediaImprove,
  onDismissImproveError,
  hasUserEdits,
  atImageLimit,
  atVideoLimit,
}: PostEditorCardProps) {
  const [hashtagInput, setHashtagInput] = useState('');

  const parsedHashtags = editedHashtags
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {/* Version picker */}
      <VersionPicker
        versions={normalizedPost.versions}
        selectedId={normalizedPost.selectedVersionId}
        bestVersionId={bestVersionId}
        onSelect={onSelectVersion}
      />

      {/* Post Strength */}
      <PostScoreMeter score={score} />

      {/* Post Body */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-[10px] font-medium text-white-40 uppercase tracking-wider">
            Post Body
          </label>
          {normalizedPost.language && normalizedPost.language !== 'en' && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-accent-green-110 bg-accent-green-110/10 px-1.5 py-0.5 rounded"
              title={`This post was generated in ${getLanguageLabel(normalizedPost.language)}`}
            >
              <Languages className="w-2.5 h-2.5" />
              {getLanguageLabel(normalizedPost.language)}
            </span>
          )}
        </div>
        <textarea
          value={editedBody}
          onChange={(e) => onBodyChange(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white-30">{editedBody.length} characters</p>
          {improveState && onTextImprove && onDismissImproveError && (
            <ImproveMenu
              improveState={improveState}
              onTextAction={onTextImprove}
              onMediaAction={onMediaImprove}
              onDismissError={onDismissImproveError}
              hasUserEdits={hasUserEdits ?? false}
              atImageLimit={atImageLimit}
              atVideoLimit={atVideoLimit}
            />
          )}
        </div>
      </div>

      {/* Hooks — Ranked by Quality */}
      <HooksRanking
        hooks={hooks}
        hasScored={hasScored}
        onUseHook={onUseHook}
      />

      {/* Call to Action */}
      <div className="border-t border-white-5 pt-3 space-y-1.5">
        <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">
          Call to Action
        </label>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {CTA_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onCtaChange(preset.value)}
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
          onChange={(e) => onCtaChange(e.target.value)}
          placeholder="e.g. Link in bio for more details"
          className="w-full px-2.5 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
        />
      </div>

      {/* Hashtags */}
      <div className="border-t border-white-5 pt-3 space-y-1.5">
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
                  onHashtagsChange(updated.join(', '));
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
                onHashtagsChange(
                  editedHashtags ? `${editedHashtags}, ${newTag}` : newTag,
                );
              }
              setHashtagInput('');
            }
          }}
          placeholder="Type a hashtag and press Enter"
          className="w-full px-2.5 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
        />
      </div>
    </div>
  );
}
