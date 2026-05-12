'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { VideoGeneratorButton, type SmartVideoStatus } from './VideoGeneratorButton';
import { resolveThumbUrl } from '@/lib/assistant/media/resolveThumb';
import type { MediaAsset } from '@/hooks/useSquadpitch';

export type { SmartVideoStatus } from './VideoGeneratorButton';

interface PostMediaActionsProps {
  /** Media IDs assigned to this post */
  mediaIds: string[];
  /** Asset lookup map */
  assetMap: Map<string, MediaAsset>;
  /** Property images for synthetic ID resolution */
  propertyImages?: Array<string | { url?: string; src?: string; imageUrl?: string; label?: string }>;
  /** Item images for synthetic ID resolution */
  itemImages?: Array<string | { url?: string; src?: string; imageUrl?: string; label?: string }>;
  /** Per-image match reasons from auto-assignment (imageId → reason string) */
  imageMatchReasons?: Map<string, string>;
  /** Post body text */
  body: string;
  /** Post CTA */
  cta: string | null;
  /** Channel name */
  channel: string;
  /** Client ID for uploads */
  clientId: string;
  /**
   * Called when Smart Video is attached. `replaceImages` reflects
   * the toggle in the Smart Video preview modal — `true` (default)
   * means swap the post's media list with the video alone; `false`
   * means add the video while keeping the existing images.
   */
  onVideoAttached: (asset: MediaAsset, replaceImages: boolean) => void;
  /** Called to add a locally generated asset to the asset map */
  onLocalAssetAdded?: (asset: MediaAsset) => void;
  /** Lifecycle status from the Smart Video flow (loading/success/error) */
  onSmartVideoStatusChange?: (status: SmartVideoStatus) => void;
  /** Button variant */
  variant?: 'compact' | 'padded';
  /** Folder ID for uploaded video */
  folderId?: string | null;
  /** Override the text that gets copied (defaults to body) */
  copyText?: string;
  /** Show copy button */
  showCopy?: boolean;
  /** Additional children rendered in the actions row */
  children?: React.ReactNode;
}

export function PostMediaActions({
  mediaIds,
  assetMap,
  propertyImages,
  itemImages,
  imageMatchReasons,
  body,
  cta,
  channel,
  clientId,
  onVideoAttached,
  onLocalAssetAdded,
  onSmartVideoStatusChange,
  variant = 'compact',
  folderId,
  copyText,
  showCopy = true,
  children,
}: PostMediaActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(copyText ?? body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [copyText, body]);

  // Build video images from assigned media IDs
  let videoImages = mediaIds
    .map((id) => {
      const resolved = resolveThumbUrl(id, assetMap, propertyImages, itemImages);
      const asset = assetMap.get(id) as any;
      // Combine all available metadata for better classification
      const matchReason = imageMatchReasons?.get(id);
      const tags: string[] = [
        ...((asset?.tags as string[]) || []),
        ...(asset?.category ? [asset.category] : []),
        ...(asset?.roomType ? [asset.roomType] : []),
        ...(matchReason ? [matchReason] : []),
        ...(asset?.matchReason ? [asset.matchReason] : []),
        ...(asset?.semanticLabels ? (asset.semanticLabels as string[]) : []),
        ...(asset?.alt ? [asset.alt] : []),
        ...(asset?.title ? [asset.title] : []),
      ];
      // Prefer descriptive metadata over raw Cloudinary filename (often a hash)
      const label = asset?.altText || asset?.caption || resolved.label;
      return {
        url: resolved.url || '',
        label,
        tags,
        confidence: asset?.confidence ?? 60,
      };
    })
    .filter((img) => img.url);

  // Fallback: use property/item images directly when no assigned media resolves
  if (videoImages.length === 0) {
    const fallbackSources = [...(propertyImages ?? []), ...(itemImages ?? [])];
    videoImages = fallbackSources
      .map((src, i) => {
        if (typeof src === 'string') return { url: src, label: `Photo ${i + 1}`, tags: [] as string[], confidence: 60 };
        const url = src.url || src.src || src.imageUrl || '';
        return { url, label: src.label || `Photo ${i + 1}`, tags: [] as string[], confidence: 60 };
      })
      .filter((img) => img.url)
      .slice(0, 10);
  }

  return (
    <>
      {showCopy && (
        <button
          onClick={handleCopy}
          className={
            variant === 'compact'
              ? 'flex items-center gap-0.5 text-[10px] text-white-40 hover:text-white-100 transition-colors'
              : 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors'
          }
        >
          {copied ? (
            <Check className={variant === 'compact' ? 'w-3 h-3 text-accent-green-110' : 'w-3 h-3 text-accent-green-110'} />
          ) : (
            <Copy className={variant === 'compact' ? 'w-3 h-3' : 'w-3 h-3'} />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}

      <VideoGeneratorButton
        images={videoImages}
        body={body}
        cta={cta}
        channel={channel}
        clientId={clientId}
        onAttached={(asset, replaceImages) => {
          onLocalAssetAdded?.(asset);
          onVideoAttached(asset, replaceImages);
        }}
        onStatusChange={onSmartVideoStatusChange}
        disabled={videoImages.length < 1}
        variant={variant}
        folderId={folderId ?? mediaIds.map((id) => assetMap.get(id)?.folderId).find((f) => f) ?? null}
      />

      {children}
    </>
  );
}
