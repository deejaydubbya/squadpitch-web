import { useState, useMemo } from 'react';
import { ImageIcon, Loader2, Video, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaAsset, Channel } from '@/hooks/useSquadpitch';
import { getGenerationErrorInfo } from '@/lib/assistant/media/generationErrors';
import { PostMediaTile } from './PostMediaTile';
import { usePostMediaGeneration } from './usePostMediaGeneration';

const VIDEO_PRESET_OPTIONS = [
  { key: undefined as string | undefined, label: 'Auto' },
  { key: 'listing_walkthrough', label: 'Walkthrough' },
  { key: 'educational_tip', label: 'Edu Tip' },
  { key: 'brand_awareness', label: 'Brand' },
  { key: 'talking_head', label: 'Talking Head' },
];

interface PostMediaTabGenerateProps {
  clientId: string;
  defaultGuidance?: string;
  aiImageAvailable: boolean;
  assetMap: Map<string, MediaAsset>;
  picked: Set<string>;
  onToggle: (id: string) => void;
  onLocalAssetAdded: (asset: MediaAsset) => void;
  onAutoAttach: (id: string) => void;
  channel?: Channel;
}

export function PostMediaTabGenerate({
  clientId,
  defaultGuidance,
  aiImageAvailable,
  assetMap,
  picked,
  onToggle,
  onLocalAssetAdded,
  onAutoAttach,
  channel,
}: PostMediaTabGenerateProps) {
  const [guidance, setGuidance] = useState(defaultGuidance ?? '');
  const [videoPreset, setVideoPreset] = useState<string | undefined>(undefined);
  const [videoDuration, setVideoDuration] = useState<string>('5');

  const {
    generateImage,
    generateVideo,
    localAssets,
    isGeneratingImage,
    isGeneratingVideo,
    imageError,
    videoError,
    atImageLimit,
    atVideoLimit,
  } = usePostMediaGeneration({
    clientId,
    onAssetReady: (asset) => {
      onLocalAssetAdded(asset);
      onAutoAttach(asset.id);
    },
    onAssetFailed: (assetId) => {
      // Remove from picked if it was auto-attached while pending
      if (picked.has(assetId)) {
        onToggle(assetId);
      }
    },
  });

  // Merge local assets into parent's assetMap for tile rendering
  const mergedAssetMap = useMemo(() => {
    const map = new Map(assetMap);
    localAssets.forEach((a, id) => map.set(id, a));
    return map;
  }, [assetMap, localAssets]);

  const generatedIds = useMemo(() => Array.from(localAssets.keys()), [localAssets]);
  const hasError = imageError || videoError;

  const handleGenerateImage = () => {
    const g = guidance.trim() || defaultGuidance || '';
    generateImage(g);
  };

  const handleGenerateVideo = () => {
    const g = guidance.trim() || defaultGuidance || '';
    generateVideo(g, videoPreset, videoDuration, channel);
  };

  return (
    <div className="space-y-2.5">
      {/* Guidance textarea */}
      <div>
        <label className="text-[9px] text-white-40 uppercase tracking-wider block mb-1">
          Guidance prompt
        </label>
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder="Describe the image or video you want..."
          rows={2}
          className="w-full px-2 py-1.5 rounded-lg bg-white-5 border border-white-10 text-[11px] text-white-100 placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50 resize-none"
        />
      </div>

      {/* Generation buttons */}
      <div className="flex items-start gap-2 flex-wrap">
        {/* Image generation */}
        {aiImageAvailable && (
          <button
            onClick={handleGenerateImage}
            disabled={isGeneratingImage || atImageLimit}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
              atImageLimit
                ? 'opacity-50 cursor-not-allowed bg-white-5 text-white-40'
                : 'bg-white-5 text-white-60 hover:bg-white-10 hover:text-white-100',
            )}
          >
            {isGeneratingImage ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ImageIcon className="w-3 h-3" />
            )}
            {isGeneratingImage ? 'Generating...' : 'Generate Image'}
            {atImageLimit && <span className="text-accent-red text-[9px] ml-0.5">Limit</span>}
          </button>
        )}

        {/* Video generation */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={handleGenerateVideo}
            disabled={isGeneratingVideo || atVideoLimit}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
              atVideoLimit
                ? 'opacity-50 cursor-not-allowed bg-white-5 text-white-40'
                : 'bg-white-5 text-white-60 hover:bg-white-10 hover:text-white-100',
            )}
          >
            {isGeneratingVideo ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Video className="w-3 h-3" />
            )}
            {isGeneratingVideo ? 'Generating...' : 'Generate Video'}
            {atVideoLimit && <span className="text-accent-red text-[9px] ml-0.5">Limit</span>}
          </button>

          {/* Video presets */}
          <div className="flex gap-1 flex-wrap">
            {VIDEO_PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.key ?? 'auto'}
                onClick={() => setVideoPreset(opt.key)}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
                  videoPreset === opt.key
                    ? 'bg-accent-green-110/20 text-accent-green-110'
                    : 'bg-white-5 text-white-30 hover:text-white-50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Duration */}
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
                    : 'bg-white-5 text-white-30 hover:text-white-50',
                )}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error panel */}
      {hasError &&
        (() => {
          const info = getGenerationErrorInfo(imageError ?? videoError);
          return (
            <div className="rounded-lg bg-accent-red/5 border border-accent-red/20 p-2.5 space-y-1.5">
              <p className="text-[11px] text-accent-red font-medium">{info.title}</p>
              <p className="text-[10px] text-white-40">{info.description}</p>
              {info.showRetry && (
                <button
                  onClick={handleGenerateImage}
                  className="text-[10px] text-white-60 hover:text-white-100 font-medium"
                >
                  Retry
                </button>
              )}
            </div>
          );
        })()}

      {/* Generated assets grid */}
      {generatedIds.length > 0 ? (
        <div>
          <p className="text-[9px] text-white-40 uppercase tracking-wider mb-1">Generated</p>
          <div className="grid grid-cols-4 gap-1.5">
            {generatedIds.map((id) => (
              <PostMediaTile
                key={id}
                id={id}
                assetMap={mergedAssetMap}
                suggestedIds={new Set()}
                selected={picked.has(id)}
                onClick={() => onToggle(id)}
              />
            ))}
          </div>
        </div>
      ) : (
        !isGeneratingImage &&
        !isGeneratingVideo &&
        !hasError && (
          <div className="flex flex-col items-center justify-center py-4 gap-1.5">
            <Wand2 className="w-5 h-5 text-white-20" />
            <p className="text-xs text-white-40">Generate a new visual for this post</p>
          </div>
        )
      )}
    </div>
  );
}
