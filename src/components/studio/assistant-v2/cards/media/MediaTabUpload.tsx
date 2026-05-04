'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Cloud,
  HardDrive,
  Loader2,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useUploadAsset, autoTagAssetFetch, type MediaAsset } from '@/hooks/useSquadpitch';
import {
  useGenericIntegrations,
  useMediaImportConnect,
} from '@/hooks/useIntegrations';
import { computeImageQuality } from '@/lib/imageQuality';
import { ImportBrowser } from '@/components/studio/ImportBrowser';
import type { SelectableImage } from './types';

const MEDIA_PROVIDERS = ['google_drive', 'dropbox'] as const;

const CONNECT_PROVIDERS = [
  { type: 'google_drive' as const, label: 'Google Drive', icon: HardDrive },
  { type: 'dropbox' as const, label: 'Dropbox', icon: Cloud },
];

function providerLabel(type: string) {
  return type === 'google_drive' ? 'Google Drive' : type === 'dropbox' ? 'Dropbox' : type;
}

function providerIcon(type: string) {
  return type === 'google_drive' ? HardDrive : Cloud;
}

interface MediaTabUploadProps {
  clientId: string;
  onImageUploaded: (image: SelectableImage) => void;
}

export function MediaTabUpload({ clientId, onImageUploaded }: MediaTabUploadProps) {
  const uploadAsset = useUploadAsset(clientId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Cloud integrations
  const qc = useQueryClient();
  const { data: integrations } = useGenericIntegrations();
  const connect = useMediaImportConnect();
  const [activeBrowserId, setActiveBrowserId] = useState<string | null>(null);

  const cloudIntegrations = integrations?.filter(
    (i) => i.isActive && MEDIA_PROVIDERS.includes(i.type as typeof MEDIA_PROVIDERS[number]),
  );

  // Listen for OAuth popup completion
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      if (e.origin !== expectedOrigin && e.origin !== window.location.origin) return;
      const ch = e.data?.channel?.toUpperCase();
      if (e.data?.type === 'sp-oauth-complete' && (ch === 'DRIVE' || ch === 'DROPBOX')) {
        qc.invalidateQueries({ queryKey: ['integrations'] });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [qc]);

  const handleConnect = (provider: 'google_drive' | 'dropbox') => {
    connect.mutate(provider, {
      onSuccess: (data) => {
        window.open(data.authUrl, 'sp-oauth-popup', 'width=600,height=720');
      },
    });
  };

  // Upload handler
  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const isVideoFile = file.type.startsWith('video/');
      const isImageFile = file.type.startsWith('image/');
      if (!isImageFile && !isVideoFile) continue;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const assetType = isVideoFile ? 'video' : 'image';
        const result = await uploadAsset.mutateAsync({ formData, assetType });
        const asset = result as MediaAsset;
        const mediaUrl = asset.url || URL.createObjectURL(file);
        // Auto-tag the uploaded asset (non-blocking)
        if (!isVideoFile && asset.id) {
          autoTagAssetFetch(clientId, asset.id);
        }

        let qualityScore: number | null = null;
        if (!isVideoFile) {
          try {
            const quality = await computeImageQuality(mediaUrl);
            qualityScore = quality.score;
          } catch {
            // Quality scoring is best-effort
          }
        }

        const newImage: SelectableImage = {
          id: asset.id,
          url: mediaUrl,
          thumbnailUrl: asset.thumbnailUrl || mediaUrl,
          source: 'upload',
          label: file.name,
          tags: asset.tags?.length ? asset.tags : undefined,
          qualityScore,
          assetType: asset.assetType,
          videoDurationSec: asset.videoDurationSec,
          asset,
        };
        onImageUploaded(newImage);
      } catch {
        // Silently skip failed uploads
      }
    }
    setUploading(false);
  }, [uploadAsset, onImageUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const connectedTypes = new Set(cloudIntegrations?.map((i) => i.type) ?? []);
  const unconnectedProviders = CONNECT_PROVIDERS.filter((p) => !connectedTypes.has(p.type));

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-lg border-2 border-dashed p-4 text-center transition-colors',
          dragOver
            ? 'border-accent-green-110 bg-accent-green-110/5'
            : 'border-white-10 hover:border-white-20'
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-accent-green-110" />
            <p className="text-xs text-white-40">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-5 h-5 text-white-30" />
            <p className="text-xs text-white-40">
              Drag & drop images or videos here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-accent-green-110 hover:underline"
              >
                browse files
              </button>
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Cloud import section */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium text-white-60 uppercase tracking-wider">Cloud Import</p>

        {/* Connected providers */}
        {cloudIntegrations?.map((integration) => {
          const Icon = providerIcon(integration.type);
          const isActive = activeBrowserId === integration.id;

          return (
            <div key={integration.id} className="space-y-2">
              <button
                onClick={() => setActiveBrowserId(isActive ? null : integration.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                  isActive
                    ? 'bg-accent-green-110/10 text-accent-green-110'
                    : 'bg-white-5 text-white-60 hover:bg-white-10 hover:text-white-100'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="font-medium">{providerLabel(integration.type)}</span>
                <span className="text-[10px] opacity-60">
                  {(integration.config as Record<string, unknown>)?.email as string || ''}
                </span>
                <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-medium bg-zone-green/20 text-zone-green">
                  Connected
                </span>
              </button>

              {isActive && (
                <ImportBrowser
                  integrationId={integration.id}
                  providerType={integration.type}
                  clientId={clientId}
                  onClose={() => setActiveBrowserId(null)}
                  onImported={(file, result) => {
                    // Auto-select the imported image
                    const asset = result as unknown as MediaAsset;
                    if (asset?.id) {
                      const newImage: SelectableImage = {
                        id: asset.id,
                        url: asset.url || file.thumbnailUrl || '',
                        thumbnailUrl: asset.thumbnailUrl || file.thumbnailUrl,
                        source: 'upload',
                        label: file.name,
                        asset,
                      };
                      onImageUploaded(newImage);
                    }
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Connect new providers */}
        {unconnectedProviders.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {unconnectedProviders.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => handleConnect(type)}
                disabled={connect.isPending}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white-5 border border-white-10 text-[10px] text-white-40 hover:text-white-60 hover:bg-white-10 transition-colors disabled:opacity-50"
              >
                {connect.isPending ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Link2 className="w-2.5 h-2.5" />
                )}
                <Icon className="w-2.5 h-2.5" />
                Connect {label}
              </button>
            ))}
          </div>
        )}

        {/* No providers at all */}
        {!cloudIntegrations?.length && unconnectedProviders.length === 0 && (
          <p className="text-[10px] text-white-30">No cloud providers available</p>
        )}

        {connect.error && (
          <p className="text-[10px] text-accent-red">
            {(connect.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
