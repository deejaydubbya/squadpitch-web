'use client';

import { useState } from 'react';
import { Wand2, Video, Loader2, Check, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGenerateMedia,
  useGenerateVideo,
  type Channel,
  type MediaAsset,
} from '@/hooks/useSquadpitch';
import { useUsage } from '@/hooks/useBilling';
import { getPreferredAspectRatio } from '@/lib/channelRegistry';
import type { AssistantSessionState } from '@/lib/assistant/types';
import type { SelectableImage } from './types';
import { MediaTile } from './MediaTile';
import { getGenerationErrorInfo } from '@/lib/assistant/media/generationErrors';

const VIDEO_PRESET_OPTIONS = [
  { key: undefined as string | undefined, label: 'Auto' },
  { key: 'listing_walkthrough', label: 'Walkthrough' },
  { key: 'educational_tip', label: 'Edu Tip' },
  { key: 'brand_awareness', label: 'Brand' },
  { key: 'talking_head', label: 'Talking Head' },
];

interface MediaTabGenerateProps {
  clientId: string;
  session: AssistantSessionState;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onImagesAvailable: (images: SelectableImage[]) => void;
  onImageUploaded: (image: SelectableImage) => void;
  channelRequiresVideo: boolean;
  activeChannel: Channel | null;
  onSwitchToLibrary?: () => void;
}

export function MediaTabGenerate({
  clientId,
  session,
  selected,
  onToggle,
  onImagesAvailable,
  onImageUploaded,
  channelRequiresVideo,
  activeChannel,
  onSwitchToLibrary,
}: MediaTabGenerateProps) {
  const generateMedia = useGenerateMedia(clientId);
  const generateVideo = useGenerateVideo(clientId);
  const { data: usage } = useUsage();

  const [videoPreset, setVideoPreset] = useState<string | undefined>(undefined);
  const [videoDuration, setVideoDuration] = useState<string>('5');
  const [guidance, setGuidance] = useState('');
  const [generatedAssets, setGeneratedAssets] = useState<SelectableImage[]>([]);

  const atImageLimit = !!(usage && isFinite(usage.limits.images) && usage.usage.images >= usage.limits.images);
  const atVideoLimit = !!(usage && isFinite(usage.limits.videos) && usage.usage.videos >= usage.limits.videos);

  // Derive rich default guidance from session context
  const defaultGuidance = (() => {
    const parts: string[] = [];
    if (session.quickPostContentType) parts.push(`Content type: ${session.quickPostContentType}`);
    if (session.quickPostGoal) parts.push(`Goal: ${session.quickPostGoal}`);
    if (activeChannel) parts.push(`Channel: ${activeChannel}`);
    if (session.quickPostSource !== 'idea' && session.propertyData) {
      const addr = session.propertyData.address || session.propertyData.title;
      if (addr) parts.push(`Property: ${addr}`);
    }
    if (session.quickPostGuidance) parts.push(session.quickPostGuidance);
    parts.push('Avoid text-heavy images');
    return parts.join('. ');
  })();

  const effectiveGuidance = guidance.trim() || defaultGuidance;

  const handleGenerate = (type: 'image' | 'video') => {
    if (!effectiveGuidance) return;

    if (type === 'image') {
      generateMedia.mutate(
        { clientId, guidance: effectiveGuidance, channel: activeChannel ?? undefined },
        {
          onSuccess: (asset: MediaAsset) => {
            const img: SelectableImage = {
              id: asset.id,
              url: asset.url || '',
              thumbnailUrl: asset.thumbnailUrl,
              source: 'library',
              label: 'AI Generated',
              assetType: asset.assetType,
              videoDurationSec: asset.videoDurationSec,
              asset,
            };
            setGeneratedAssets((prev) => [...prev, img]);
            onImageUploaded(img);
          },
        }
      );
    } else {
      generateVideo.mutate(
        {
          clientId,
          guidance: effectiveGuidance,
          preset: videoPreset,
          duration: videoDuration,
          channel: activeChannel ?? undefined,
          aspectRatio: activeChannel ? getPreferredAspectRatio(activeChannel) : undefined,
        },
        {
          onSuccess: (asset: MediaAsset) => {
            const img: SelectableImage = {
              id: asset.id,
              url: asset.url || '',
              thumbnailUrl: asset.thumbnailUrl,
              source: 'library',
              label: 'AI Generated Video',
              assetType: 'video',
              videoDurationSec: asset.videoDurationSec,
              asset,
            };
            setGeneratedAssets((prev) => [...prev, img]);
            onImageUploaded(img);
          },
        }
      );
    }
  };

  const isGenerating = generateMedia.isPending || generateVideo.isPending;

  return (
    <div className="space-y-3">
      {/* Guidance input */}
      <div>
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder={defaultGuidance || 'Describe what to generate...'}
          rows={2}
          className="w-full rounded-lg bg-white-5 border border-white-10 px-2.5 py-1.5 text-xs text-white-80 placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50 resize-none"
        />
      </div>

      {/* Generate buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Generate Image — hidden when channel requires video */}
        {!channelRequiresVideo && (
          <button
            onClick={() => handleGenerate('image')}
            disabled={isGenerating || atImageLimit || !effectiveGuidance}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              atImageLimit
                ? 'bg-white-10 text-white-30 cursor-not-allowed'
                : 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 disabled:opacity-50'
            )}
          >
            {generateMedia.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : generateMedia.isSuccess ? (
              <Check className="w-3 h-3" />
            ) : (
              <Wand2 className="w-3 h-3" />
            )}
            {atImageLimit ? 'Image limit reached' : 'Generate Image'}
          </button>
        )}

        {/* Generate Video */}
        <button
          onClick={() => handleGenerate('video')}
          disabled={isGenerating || atVideoLimit || !effectiveGuidance}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            atVideoLimit
              ? 'bg-white-10 text-white-30 cursor-not-allowed'
              : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50'
          )}
        >
          {generateVideo.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : generateVideo.isSuccess ? (
            <Check className="w-3 h-3" />
          ) : (
            <Video className="w-3 h-3" />
          )}
          {atVideoLimit ? 'Video limit reached' : 'Generate Video'}
        </button>
      </div>

      {/* Video presets */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-white-40">Video preset</p>
        <div className="flex gap-1 flex-wrap">
          {VIDEO_PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setVideoPreset(opt.key)}
              className={cn(
                'px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors',
                videoPreset === opt.key
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'bg-white-5 text-white-30 hover:text-white-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Video duration */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white-40">Duration</span>
        {['5', '10'].map((d) => (
          <button
            key={d}
            onClick={() => setVideoDuration(d)}
            className={cn(
              'px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors',
              videoDuration === d
                ? 'bg-white-10 text-white-80'
                : 'text-white-30 hover:text-white-50'
            )}
          >
            {d}s
          </button>
        ))}
      </div>

      {/* Error feedback — recovery panel */}
      {(generateMedia.isError || generateVideo.isError) && (() => {
        const err = generateMedia.error ?? generateVideo.error;
        const info = getGenerationErrorInfo(err);
        return (
          <div className="rounded-lg bg-accent-red/5 border border-accent-red/20 p-3 space-y-2">
            <p className="text-xs text-accent-red font-medium">{info.title}</p>
            <p className="text-[11px] text-white-40">{info.description}</p>
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              {info.showUpgrade && (
                <a
                  href="/settings/billing"
                  className="text-[11px] font-medium text-accent-green-110 hover:underline"
                >
                  Upgrade to Pro
                </a>
              )}
              {info.showRetry && (
                <button
                  onClick={() => handleGenerate('image')}
                  className="text-[11px] text-white-60 hover:text-white-100 font-medium"
                >
                  Retry
                </button>
              )}
              {onSwitchToLibrary && (
                <button
                  onClick={onSwitchToLibrary}
                  className="flex items-center gap-1 text-[11px] text-accent-green-110 hover:underline"
                >
                  <ImageIcon className="w-3 h-3" />
                  Choose from media library
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Generated assets grid */}
      {generatedAssets.length > 0 && (
        <div>
          <p className="text-[10px] text-white-40 mb-1.5">Generated ({generatedAssets.length})</p>
          <div className="grid grid-cols-3 gap-1.5">
            {generatedAssets.map((img) => (
              <MediaTile
                key={img.id}
                image={img}
                isSelected={selected.has(img.id)}
                isHero={false}
                onToggle={onToggle}
                onHeroToggle={() => {}}
                onPreview={() => {}}
                priorityScore={null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Generating placeholder */}
      {isGenerating && generatedAssets.length === 0 && (
        <div className="flex flex-col items-center py-4 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-accent-green-110" />
          <p className="text-xs text-white-40">Generating...</p>
        </div>
      )}
    </div>
  );
}
