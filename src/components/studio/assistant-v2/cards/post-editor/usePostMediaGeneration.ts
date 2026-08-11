import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGenerateMedia, useGenerateVideo, type MediaAsset, type Channel } from '@/hooks/useSquadpitch';
import { useUsage } from '@/hooks/useBilling';
import { apiFetch } from '@/lib/apiFetch';

interface UsePostMediaGenerationOptions {
  clientId: string;
  onAssetReady: (asset: MediaAsset) => void;
  onAssetFailed?: (assetId: string) => void;
}

export function usePostMediaGeneration({
  clientId,
  onAssetReady,
  onAssetFailed,
}: UsePostMediaGenerationOptions) {
  const qc = useQueryClient();
  const generateMediaMutation = useGenerateMedia(clientId);
  const generateVideoMutation = useGenerateVideo(clientId);
  const { data: usage } = useUsage(clientId);

  const [localAssets, setLocalAssets] = useState<Map<string, MediaAsset>>(new Map());

  const atImageLimit = !!(
    usage &&
    isFinite(usage.limits.images) &&
    usage.usage.images >= usage.limits.images
  );
  const atVideoLimit = !!(
    usage &&
    isFinite(usage.limits.videos) &&
    usage.usage.videos >= usage.limits.videos
  );

  const pollAssetUntilReady = useCallback(async (assetId: string): Promise<MediaAsset | null> => {
    const MAX_POLLS = 20;
    const POLL_INTERVAL = 3000;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      try {
        const fresh = await apiFetch<MediaAsset>(`assets/${assetId}`);
        if (fresh.status === 'READY' && fresh.url) return fresh;
        if (fresh.status === 'FAILED') return fresh;
      } catch {
        // Network hiccup — keep trying
      }
    }
    return null;
  }, []);

  const handleEnqueued = useCallback(
    async (asset: MediaAsset) => {
      setLocalAssets((prev) => new Map(prev).set(asset.id, asset));

      if (asset.status === 'READY' && asset.url) {
        onAssetReady(asset);
        return;
      }

      const ready = await pollAssetUntilReady(asset.id);
      if (ready && ready.status === 'READY' && ready.url) {
        setLocalAssets((prev) => new Map(prev).set(ready.id, ready));
        qc.invalidateQueries({ queryKey: ['squadpitch', 'assets'] });
        onAssetReady(ready);
      } else if (ready?.status === 'FAILED') {
        setLocalAssets((prev) => {
          const next = new Map(prev);
          next.delete(asset.id);
          return next;
        });
        onAssetFailed?.(asset.id);
      }
    },
    [pollAssetUntilReady, onAssetReady, onAssetFailed, qc],
  );

  const generateImage = useCallback(
    (guidance: string) => {
      generateMediaMutation.mutate({ clientId, guidance }, { onSuccess: handleEnqueued });
    },
    [generateMediaMutation, clientId, handleEnqueued],
  );

  const generateImageWithPersona = useCallback(
    (guidance: string) => {
      generateMediaMutation.mutate(
        { clientId, guidance, usePersona: true },
        { onSuccess: handleEnqueued },
      );
    },
    [generateMediaMutation, clientId, handleEnqueued],
  );

  const generateVideo = useCallback(
    (guidance: string, preset?: string, duration?: string, channel?: Channel) => {
      generateVideoMutation.mutate(
        { clientId, guidance, preset, duration, channel },
        { onSuccess: handleEnqueued },
      );
    },
    [generateVideoMutation, clientId, handleEnqueued],
  );

  return {
    generateImage,
    generateImageWithPersona,
    generateVideo,
    localAssets,
    isGeneratingImage: generateMediaMutation.isPending,
    isGeneratingVideo: generateVideoMutation.isPending,
    imageError: generateMediaMutation.error,
    videoError: generateVideoMutation.error,
    imageSuccess: generateMediaMutation.isSuccess,
    videoSuccess: generateVideoMutation.isSuccess,
    atImageLimit,
    atVideoLimit,
  };
}
