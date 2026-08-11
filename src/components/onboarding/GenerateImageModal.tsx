'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Wand2, X, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useGenerateMedia, type Channel, type MediaAsset } from '@/hooks/useSquadpitch';

// ── Visual type / style options ──────────────────────────────────────

const VISUAL_TYPES = [
  { key: 'listing_graphic', label: 'Listing graphic' },
  { key: 'tip_graphic', label: 'Tip graphic' },
  { key: 'branded_post', label: 'Branded post' },
  { key: 'carousel_slide', label: 'Carousel slide' },
] as const;

const VISUAL_STYLES = [
  { key: 'modern', label: 'Modern' },
  { key: 'luxury', label: 'Luxury' },
  { key: 'minimal', label: 'Minimal' },
  { key: 'bold_social', label: 'Bold social' },
  { key: 'professional', label: 'Professional' },
] as const;

// ── RE-blocked visual types (fake property photos) ───────────────────

const RE_BLOCKED_TYPES = new Set([
  'fake_property_photo', 'fake_interior', 'fake_exterior', 'photorealistic_listing',
]);

// ── Props ────────────────────────────────────────────────────────────

interface GenerateImageModalProps {
  clientId: string;
  draftId?: string;
  channel?: Channel;
  isRealEstate?: boolean;
  listingImageUrl?: string;
  defaultGuidance?: string;
  onGenerated: (asset: MediaAsset) => void;
  onClose: () => void;
}

export function GenerateImageModal({
  clientId,
  draftId,
  channel,
  isRealEstate,
  listingImageUrl,
  defaultGuidance,
  onGenerated,
  onClose,
}: GenerateImageModalProps) {
  const [visualType, setVisualType] = useState<string>('branded_post');
  const [style, setStyle] = useState<string>('modern');
  const [textOverlay, setTextOverlay] = useState('');
  const [useListingBg, setUseListingBg] = useState(!!listingImageUrl);

  const generateMedia = useGenerateMedia(clientId);

  const buildGuidance = (): string => {
    const parts: string[] = [];
    const typeLabel = VISUAL_TYPES.find(t => t.key === visualType)?.label ?? visualType;
    const styleLabel = VISUAL_STYLES.find(s => s.key === style)?.label ?? style;
    parts.push(`Create a ${styleLabel.toLowerCase()} ${typeLabel.toLowerCase()}.`);
    if (defaultGuidance) parts.push(defaultGuidance);
    if (textOverlay.trim()) parts.push(`Text overlay: "${textOverlay.trim()}".`);
    if (useListingBg && listingImageUrl) parts.push(`Use listing photo as background.`);
    if (isRealEstate) {
      parts.push('This is a marketing graphic, NOT a replacement property photo. Do NOT generate photorealistic property images.');
    }
    return parts.join(' ');
  };

  const handleGenerate = () => {
    const guidance = buildGuidance();
    generateMedia.mutate(
      {
        clientId,
        guidance,
        draftId,
        channel: channel ?? undefined,
        overrides: {
          visualType,
          style,
          ...(useListingBg && listingImageUrl ? { backgroundImageUrl: listingImageUrl } : {}),
        },
      },
      {
        onSuccess: (asset) => {
          onGenerated(asset);
          onClose();
        },
      },
    );
  };

  const isGenerating = generateMedia.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="safe-area-bottom flex max-h-[calc(100dvh-env(safe-area-inset-top,0px))] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white-10 bg-sp-card shadow-xl sm:mx-4 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white-10">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-accent-green-110" />
            <h3 className="text-sm font-semibold text-white">Generate visual</h3>
          </div>
          <button onClick={onClose} className="grid min-h-11 min-w-11 place-items-center text-white-40 transition-colors hover:text-white-70" aria-label="Close image generator">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 py-4 overscroll-contain">
          {/* RE safety notice */}
          {isRealEstate && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/8 border border-yellow-500/15">
              <ShieldAlert className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-white-40 leading-relaxed">
                AI visuals are for marketing graphics, overlays, and carousels — not replacement property photos.
              </p>
            </div>
          )}

          {/* Visual type */}
          <div>
            <label className="text-xs font-medium text-white-50 mb-1.5 block">Visual type</label>
            <div className="flex flex-wrap gap-1.5">
              {VISUAL_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setVisualType(t.key)}
                  className={cn(
                    'min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    visualType === t.key
                      ? 'bg-accent-green-110/15 text-accent-green-110 border border-accent-green-110/30'
                      : 'bg-white-5 text-white-50 border border-white-10 hover:border-white-15',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="text-xs font-medium text-white-50 mb-1.5 block">Style</label>
            <div className="flex flex-wrap gap-1.5">
              {VISUAL_STYLES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStyle(s.key)}
                  className={cn(
                    'min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    style === s.key
                      ? 'bg-accent-green-110/15 text-accent-green-110 border border-accent-green-110/30'
                      : 'bg-white-5 text-white-50 border border-white-10 hover:border-white-15',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text overlay */}
          <div>
            <label className="text-xs font-medium text-white-50 mb-1.5 block">Text overlay (optional)</label>
            <input
              type="text"
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
              placeholder="e.g., Just Listed, Open Sunday 1–4pm"
              className="min-h-11 w-full rounded-lg border border-white-10 bg-white-5 px-3 py-2 text-base text-white-80 placeholder:text-white-25 focus:border-accent-green-110/40 focus:outline-none sm:text-xs"
            />
          </div>

          {/* Use listing image as background */}
          {listingImageUrl && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useListingBg}
                onChange={(e) => setUseListingBg(e.target.checked)}
                className="accent-accent-green-110"
              />
              <span className="text-xs text-white-50">Use listing image as background</span>
            </label>
          )}

          {/* Error */}
          {generateMedia.isError && (
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertTriangle className="w-3 h-3" />
              <p className="text-[11px]">
                {(generateMedia.error as Error)?.message || 'Image generation failed. Try again.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white-10 px-4 py-3">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="min-h-11 px-4 py-2 rounded-lg text-xs text-white-50 hover:bg-white-5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={cn(
              'flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
              isGenerating
                ? 'bg-white-10 text-white-30 cursor-not-allowed'
                : 'bg-accent-green-110 text-black hover:bg-accent-green-110/90',
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                Generate visual
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
