'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import { ImageIcon, Upload, Building2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssets, useUploadAsset, useChannelSettings, type Channel, type MediaAsset } from '@/hooks/useSquadpitch';
import { useCampaignIntelligence } from '@/hooks/useCampaignIntelligence';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

type MediaSource = 'property' | 'library' | 'upload';

interface SelectableImage {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  source: MediaSource;
  label?: string;
}

export function MediaSelectCard({ session, clientId, onSelection }: Props) {
  const { data: assets, isLoading } = useAssets(clientId, { status: 'READY', assetType: 'image' });
  const { data: channelSettings } = useChannelSettings(clientId);
  const uploadAsset = useUploadAsset(clientId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const connectedChannels: Channel[] = useMemo(() => {
    if (!channelSettings) return [];
    return channelSettings.filter((cs) => cs.isEnabled).map((cs) => cs.channel);
  }, [channelSettings]);

  const { mediaRec } = useCampaignIntelligence(session, connectedChannels, assets);

  // Extract property images from session.propertyData
  const propertyImages: SelectableImage[] = useMemo(() => {
    if (!session.propertyData) return [];
    const data = session.propertyData;
    const urls: string[] = Array.isArray(data.images)
      ? (data.images as string[])
      : typeof data.imageUrl === 'string'
        ? [data.imageUrl]
        : [];
    return urls.map((url, i) => ({
      id: `property_img_${i}`,
      url,
      thumbnailUrl: url,
      source: 'property' as MediaSource,
      label: i === 0 ? 'Hero' : undefined,
    }));
  }, [session.propertyData]);

  // Build library images (sorted by intelligence recommendation)
  const libraryImages: SelectableImage[] = useMemo(() => {
    if (!assets) return [];
    const sorted = mediaRec
      ? [...assets].sort((a, b) => {
          const priorityMap = new Map(mediaRec.prioritized.map((p, i) => [p.id, i]));
          return (priorityMap.get(a.id) ?? Infinity) - (priorityMap.get(b.id) ?? Infinity);
        })
      : assets;
    return sorted.map((asset) => ({
      id: asset.id,
      url: asset.url || '',
      thumbnailUrl: asset.thumbnailUrl || asset.url,
      source: 'library' as MediaSource,
      label: mediaRec?.heroImageId === asset.id ? 'Recommended' : undefined,
    }));
  }, [assets, mediaRec]);

  // Uploaded images during this session (tracked locally)
  const [uploadedImages, setUploadedImages] = useState<SelectableImage[]>([]);
  const [uploading, setUploading] = useState(false);

  // Combined selectable images: property first (recommended), then library
  const allImages = useMemo(() => {
    return [...propertyImages, ...uploadedImages, ...libraryImages];
  }, [propertyImages, uploadedImages, libraryImages]);

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(() => new Set(session.selectedMediaIds));

  // Auto-select property images on first render if available and nothing previously selected
  const [autoSelected, setAutoSelected] = useState(false);
  if (!autoSelected && propertyImages.length > 0 && selected.size === 0) {
    setAutoSelected(true);
    setSelected(new Set(propertyImages.map((p) => p.id)));
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (source: MediaSource) => {
    const ids = allImages.filter((img) => img.source === source).map((img) => img.id);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  // Upload handler
  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await uploadAsset.mutateAsync({ formData, assetType: 'image' });
        const newImage: SelectableImage = {
          id: (result as MediaAsset).id,
          url: (result as MediaAsset).url || URL.createObjectURL(file),
          thumbnailUrl: (result as MediaAsset).thumbnailUrl || URL.createObjectURL(file),
          source: 'upload',
          label: file.name,
        };
        setUploadedImages((prev) => [...prev, newImage]);
        setSelected((prev) => {
          const next = new Set(prev);
          next.add(newImage.id);
          return next;
        });
      } catch {
        // Silently skip failed uploads
      }
    }
    setUploading(false);
  }, [uploadAsset]);

  // Build confirmation text with source breakdown
  const buildConfirmationText = (): string => {
    const selectedImages = allImages.filter((img) => selected.has(img.id));
    const bySource = { property: 0, library: 0, upload: 0 };
    for (const img of selectedImages) bySource[img.source]++;

    const total = selectedImages.length;
    if (total === 0) return 'No images selected';

    const parts: string[] = [];
    if (bySource.property > 0) parts.push(`${bySource.property} property`);
    if (bySource.library > 0) parts.push(`${bySource.library} media library`);
    if (bySource.upload > 0) parts.push(`${bySource.upload} uploaded`);

    return `${total} image${total !== 1 ? 's' : ''} selected (${parts.join(', ')})`;
  };

  const confirm = () => {
    // Only pass real asset IDs to session state (not synthetic property_img_* IDs)
    // Property images are already available via session.propertyData.images for generation
    const realAssetIds = Array.from(selected).filter((id) => !id.startsWith('property_img_'));
    const hasPropertySelection = Array.from(selected).some((id) => id.startsWith('property_img_'));

    if (realAssetIds.length > 0) {
      onSelection(
        { type: 'SET_MEDIA', payload: realAssetIds },
        buildConfirmationText()
      );
    } else if (hasPropertySelection) {
      // User selected only property images — mark as acknowledged (property images
      // are included in generation via propertyData.images, not mediaAssetIds)
      onSelection(
        { type: 'SET_MEDIA_ACKNOWLEDGED' },
        buildConfirmationText()
      );
    } else {
      onSelection(
        { type: 'SET_MEDIA', payload: [] },
        'No images selected'
      );
    }
  };

  const skip = () => {
    onSelection(
      { type: 'SET_MEDIA_ACKNOWLEDGED' },
      'Skipped — AI will generate without specific images'
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
      </div>
    );
  }

  const hasPropertyImages = propertyImages.length > 0;
  const hasLibraryImages = libraryImages.length > 0;
  const hasAnyImages = allImages.length > 0;

  return (
    <div className="space-y-3">
      {/* Property Images Section */}
      {hasPropertyImages && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Building2 className="w-3 h-3 text-accent-green-110" />
            <span className="text-[10px] font-medium text-white-60 uppercase tracking-wider">Property Photos</span>
            <button
              onClick={() => selectAll('property')}
              className="ml-auto text-[10px] text-accent-green-110 hover:underline"
            >
              Select all
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {propertyImages.slice(0, 8).map((img) => (
              <ImageTile
                key={img.id}
                image={img}
                isSelected={selected.has(img.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Media Library Section */}
      {hasLibraryImages && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <FolderOpen className="w-3 h-3 text-white-40" />
            <span className="text-[10px] font-medium text-white-60 uppercase tracking-wider">Media Library</span>
            {libraryImages.length > 0 && (
              <button
                onClick={() => selectAll('library')}
                className="ml-auto text-[10px] text-accent-green-110 hover:underline"
              >
                Select all
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto">
            {libraryImages.slice(0, 12).map((img) => (
              <ImageTile
                key={img.id}
                image={img}
                isSelected={selected.has(img.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Upload className="w-3 h-3 text-white-40" />
            <span className="text-[10px] font-medium text-white-60 uppercase tracking-wider">Uploaded</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {uploadedImages.map((img) => (
              <ImageTile
                key={img.id}
                image={img}
                isSelected={selected.has(img.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyImages && (
        <div className="flex flex-col items-center py-4 text-center">
          <ImageIcon className="w-5 h-5 text-white-30 mb-2" />
          <p className="text-xs text-white-40">No images available. Upload some or skip to generate without media.</p>
        </div>
      )}

      {/* Upload + Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={confirm}
          disabled={selected.size === 0}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            selected.size > 0
              ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90'
              : 'bg-white-10 text-white-40 cursor-not-allowed'
          )}
        >
          {selected.size > 0 ? `Confirm (${selected.size})` : 'Select images'}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors flex items-center gap-1"
        >
          <Upload className="w-3 h-3" />
          {uploading ? 'Uploading...' : 'Upload'}
        </button>

        <button
          onClick={skip}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          Skip
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Selection summary */}
      {selected.size > 0 && (
        <p className="text-[10px] text-white-40">
          {buildConfirmationText()}
        </p>
      )}
    </div>
  );
}

// ── Image Tile Sub-Component ──────────────────────────────────────────────

function ImageTile({
  image,
  isSelected,
  onToggle,
}: {
  image: SelectableImage;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(image.id)}
      className={cn(
        'relative aspect-square rounded-lg border overflow-hidden transition-colors',
        isSelected
          ? 'border-accent-green-110 ring-2 ring-accent-green-110/40'
          : 'border-white-10 hover:border-white-20'
      )}
    >
      {image.thumbnailUrl || image.url ? (
        <img src={image.thumbnailUrl || image.url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-white-5 flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-white-20" />
        </div>
      )}
      {image.label && (
        <span className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-black/70 text-white text-[8px] font-medium">
          {image.label}
        </span>
      )}
      {isSelected && (
        <div className="absolute inset-0 bg-accent-green-110/20 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-accent-green-110 flex items-center justify-center">
            <svg className="w-3 h-3 text-sp-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}
