'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Wand2,
  Trash2,
  Loader2,
  ImageOff,
  Paperclip,
  Film,
  Video,
  Eye,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAssets,
  useUploadAsset,
  useDeleteAsset,
  useGenerateMedia,
  useGenerateVideo,
  useDrafts,
  type MediaAssetSource,
  type MediaAssetStatus,
  type MediaAssetType,
  type MediaAsset,
} from '@/hooks/useSquadpitch';
import { StatusBanner } from '@/components/common/StatusBanner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AssetPreviewModal } from './AssetPreviewModal';
import { AttachToPostModal } from './AttachToPostModal';
import { CloudImportExport } from './CloudImportExport';

interface Props {
  clientId: string;
}

const SOURCE_OPTIONS: { label: string; value: MediaAssetSource | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Uploads', value: 'UPLOAD' },
  { label: 'AI Generated', value: 'AI_GENERATED' },
  { label: 'Imported', value: 'IMPORTED' },
];

const STATUS_OPTIONS: { label: string; value: MediaAssetStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Ready', value: 'READY' },
  { label: 'Generating', value: 'GENERATING' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
];

const TYPE_OPTIONS: { label: string; value: MediaAssetType | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Images', value: 'image' },
  { label: 'Videos', value: 'video' },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusColor(status: MediaAssetStatus): string {
  switch (status) {
    case 'READY':
      return 'bg-zone-green/20 text-zone-green';
    case 'GENERATING':
    case 'PENDING':
      return 'bg-zone-yellow/20 text-zone-yellow';
    case 'FAILED':
      return 'bg-accent-red/20 text-accent-red';
  }
}

export function AssetLibrary({ clientId }: Props) {
  // ── Filters ───────────────────────────────────────────────────────
  const [sourceFilter, setSourceFilter] = useState<MediaAssetSource | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<MediaAssetStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<MediaAssetType | 'ALL'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (sourceFilter !== 'ALL') f.source = sourceFilter;
    if (statusFilter !== 'ALL') f.status = statusFilter;
    if (typeFilter !== 'ALL') f.assetType = typeFilter;
    if (debouncedSearch.trim()) f.search = debouncedSearch.trim();
    return f;
  }, [sourceFilter, statusFilter, typeFilter, debouncedSearch]);

  // ── Data ──────────────────────────────────────────────────────────
  const [poll, setPoll] = useState(false);

  const {
    data: assets,
    isLoading,
    error,
  } = useAssets(clientId, filters, poll);

  // Enable polling when any asset is in-progress
  const hasInProgress = useMemo(
    () => assets?.some((a) => a.status === 'PENDING' || a.status === 'GENERATING') ?? false,
    [assets]
  );

  useEffect(() => {
    setPoll(hasInProgress);
  }, [hasInProgress]);

  const { data: drafts } = useDrafts({ clientId, limit: 100 });
  const attachableDrafts = useMemo(
    () => drafts?.filter((d) => d.status === 'DRAFT' || d.status === 'APPROVED') ?? [],
    [drafts]
  );

  // ── Mutations ─────────────────────────────────────────────────────
  const uploadAsset = useUploadAsset(clientId);
  const deleteAsset = useDeleteAsset(clientId);
  const generateMedia = useGenerateMedia(clientId);
  const generateVideo = useGenerateVideo(clientId);

  // ── Upload ────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [showUploadMeta, setShowUploadMeta] = useState(false);
  const [uploadMode, setUploadMode] = useState<'image' | 'video'>('image');

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      if (uploadAltText.trim()) formData.append('altText', uploadAltText.trim());
      if (uploadCaption.trim()) formData.append('caption', uploadCaption.trim());
      uploadAsset.mutate({ formData, assetType: uploadMode }, {
        onSuccess: () => {
          setUploadAltText('');
          setUploadCaption('');
          setShowUploadMeta(false);
        },
      });
    },
    [uploadAsset, uploadAltText, uploadCaption, uploadMode]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // ── AI Generation ─────────────────────────────────────────────────
  const [guidance, setGuidance] = useState('');
  const [genDraftId, setGenDraftId] = useState('');
  const [genMode, setGenMode] = useState<'image' | 'video'>('image');

  const handleGenerate = () => {
    if (!guidance.trim()) return;
    if (genMode === 'video') {
      generateVideo.mutate(
        {
          clientId,
          guidance: guidance.trim(),
          draftId: genDraftId || undefined,
        },
        {
          onSuccess: () => {
            setGuidance('');
            setGenDraftId('');
          },
        }
      );
    } else {
      generateMedia.mutate(
        {
          clientId,
          guidance: guidance.trim(),
          draftId: genDraftId || undefined,
        },
        {
          onSuccess: () => {
            setGuidance('');
            setGenDraftId('');
          },
        }
      );
    }
  };

  const isGenerating = genMode === 'video' ? generateVideo.isPending : generateMedia.isPending;
  const generateError = genMode === 'video' ? generateVideo.error : generateMedia.error;

  // ── Modal state ─────────────────────────────────────────────────
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [attachAssetId, setAttachAssetId] = useState<string | null>(null);

  // ── Delete confirmation ───────────────────────────────────────────
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const handleDelete = (assetId: string) => {
    deleteAsset.mutate(assetId, {
      onSuccess: () => setDeletingAssetId(null),
    });
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Filter bar + Search */}
      <div className="card p-4 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-40" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white-40 font-medium">Source:</span>
            <div className="flex gap-1">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSourceFilter(opt.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    sourceFilter === opt.value
                      ? 'bg-accent-green-110 text-white-100'
                      : 'bg-white-10 text-white-60 hover:bg-white-20'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white-40 font-medium">Status:</span>
            <div className="flex gap-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    statusFilter === opt.value
                      ? 'bg-accent-green-110 text-white-100'
                      : 'bg-white-10 text-white-60 hover:bg-white-20'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white-40 font-medium">Type:</span>
            <div className="flex gap-1">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTypeFilter(opt.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    typeFilter === opt.value
                      ? 'bg-accent-green-110 text-white-100'
                      : 'bg-white-10 text-white-60 hover:bg-white-20'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upload + Generate row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upload section */}
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white-100 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload
          </h3>
          {/* Image / Video toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setUploadMode('image')}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                uploadMode === 'image'
                  ? 'bg-accent-green-110 text-white-100'
                  : 'bg-white-10 text-white-60 hover:bg-white-20'
              )}
            >
              Image
            </button>
            <button
              onClick={() => setUploadMode('video')}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                uploadMode === 'video'
                  ? 'bg-accent-green-110 text-white-100'
                  : 'bg-white-10 text-white-60 hover:bg-white-20'
              )}
            >
              Video
            </button>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-accent-green-110 bg-accent-green-110/10'
                : 'border-white-10 bg-white-5 hover:border-white-20'
            )}
          >
            {uploadAsset.isPending ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-accent-green-110" />
                <span className="text-sm text-white-60">Uploading...</span>
              </div>
            ) : uploadMode === 'video' ? (
              <div className="space-y-1">
                <Video className="w-6 h-6 mx-auto text-white-40" />
                <p className="text-sm text-white-60">
                  Drop an MP4 video or <span className="text-accent-green-110">click to browse</span>
                </p>
                <p className="text-xs text-white-40">MP4 only, max 500 MB, max 10 min</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-6 h-6 mx-auto text-white-40" />
                <p className="text-sm text-white-60">
                  Drop an image here or <span className="text-accent-green-110">click to browse</span>
                </p>
                <p className="text-xs text-white-40">JPG, PNG, WebP, GIF</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={uploadMode === 'video' ? 'video/mp4' : 'image/jpeg,image/png,image/webp,image/gif'}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <button
            onClick={() => setShowUploadMeta((v) => !v)}
            className="text-xs text-white-40 hover:text-white-100 transition-colors"
          >
            {showUploadMeta ? 'Hide' : 'Add'} alt text / caption
          </button>
          {showUploadMeta && (
            <div className="space-y-2">
              <input
                type="text"
                value={uploadAltText}
                onChange={(e) => setUploadAltText(e.target.value)}
                placeholder="Alt text"
                className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
              />
              <input
                type="text"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="Caption"
                className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
              />
            </div>
          )}

          {uploadAsset.error && (
            <StatusBanner error={(uploadAsset.error as Error).message} />
          )}
        </div>

        {/* AI Generation section */}
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white-100 flex items-center gap-2">
            <Wand2 className="w-4 h-4" /> AI Generate
          </h3>
          {/* Image / Video toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setGenMode('image')}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                genMode === 'image'
                  ? 'bg-accent-green-110 text-white-100'
                  : 'bg-white-10 text-white-60 hover:bg-white-20'
              )}
            >
              Image
            </button>
            <button
              onClick={() => setGenMode('video')}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                genMode === 'video'
                  ? 'bg-accent-green-110 text-white-100'
                  : 'bg-white-10 text-white-60 hover:bg-white-20'
              )}
            >
              Video
            </button>
          </div>
          <textarea
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            placeholder={genMode === 'video' ? 'Describe the video you want to generate...' : 'Describe the image you want to generate...'}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
          />
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-white-40 mb-1 block">Link to draft (optional)</label>
              <select
                value={genDraftId}
                onChange={(e) => setGenDraftId(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 [&>option]:bg-[#1a1a1a] [&>option]:text-white"
              >
                <option value="">None</option>
                {attachableDrafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.channel} — {d.body.slice(0, 40)}...
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!guidance.trim() || isGenerating}
              className="px-4 py-2 rounded-lg bg-accent-green-110 text-white-100 text-sm font-medium hover:bg-accent-green-110/80 disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Generate {genMode === 'video' ? 'Video' : 'Image'}
            </button>
          </div>

          {generateError && (
            <StatusBanner error={(generateError as Error).message} />
          )}
        </div>
      </div>

      {/* Cloud Import/Export */}
      <CloudImportExport clientId={clientId} assets={assets} />

      {/* Loading / error state */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading assets...</span>
        </div>
      )}
      {error && <StatusBanner error={(error as Error).message} />}

      {/* Polling indicator */}
      {hasInProgress && (
        <div className="flex items-center gap-2 text-xs text-zone-yellow">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Assets are being processed — auto-refreshing...
        </div>
      )}

      {/* Asset grid */}
      {!isLoading && assets && (
        <>
          {assets.length === 0 ? (
            <div className="card p-8 text-center space-y-4">
              <ImageOff className="w-10 h-10 mx-auto text-white-20" />
              <p className="text-sm text-white-40">
                Upload images or generate visuals to start building your media library.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg bg-white-10 text-white-60 text-sm font-medium hover:bg-white-20 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Upload
                </button>
                <button
                  onClick={() => { setGenMode('image'); document.querySelector<HTMLTextAreaElement>('textarea')?.focus(); }}
                  className="px-4 py-2 rounded-lg bg-accent-green-110 text-white-100 text-sm font-medium hover:bg-accent-green-110/80 flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" /> Generate Image
                </button>
                <button
                  onClick={() => { setGenMode('video'); document.querySelector<HTMLTextAreaElement>('textarea')?.focus(); }}
                  className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 flex items-center gap-2"
                >
                  <Video className="w-4 h-4" /> Generate Video
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onPreview={() => setPreviewAsset(asset)}
                  onAttach={() => setAttachAssetId(asset.id)}
                  isConfirmingDelete={deletingAssetId === asset.id}
                  onDeleteClick={() => setDeletingAssetId(asset.id)}
                  onDeleteConfirm={() => handleDelete(asset.id)}
                  onDeleteCancel={() => setDeletingAssetId(null)}
                  isDeleting={deleteAsset.isPending}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Preview modal */}
      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          clientId={clientId}
          onClose={() => setPreviewAsset(null)}
          onAttach={() => {
            setAttachAssetId(previewAsset.id);
            setPreviewAsset(null);
          }}
        />
      )}

      {/* Attach to post modal */}
      {attachAssetId && (
        <AttachToPostModal
          assetId={attachAssetId}
          clientId={clientId}
          onClose={() => setAttachAssetId(null)}
        />
      )}
    </div>
  );
}

// ── Asset Card sub-component ──────────────────────────────────────────

interface AssetCardProps {
  asset: MediaAsset;
  onPreview: () => void;
  onAttach: () => void;
  isConfirmingDelete: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  isDeleting: boolean;
}

function AssetCard({
  asset,
  onPreview,
  onAttach,
  isConfirmingDelete,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  isDeleting,
}: AssetCardProps) {
  const isProcessing = asset.status === 'PENDING' || asset.status === 'GENERATING';

  // Elapsed timer — ticks every 1s while processing, based on asset.createdAt
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isProcessing) {
      setElapsed(0);
      return;
    }
    const createdMs = new Date(asset.createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - createdMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isProcessing, asset.createdAt]);

  return (
    <div className="card p-0 overflow-hidden group/card">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-white-5">
        {asset.status === 'READY' && (asset.assetType === 'video' ? asset.thumbnailUrl : asset.url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.assetType === 'video' ? (asset.thumbnailUrl || asset.url!) : asset.url!}
            alt={asset.altText || asset.filename || 'Asset'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            {isProcessing ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-zone-yellow" />
                {asset.progressStage && (
                  <span className="text-[10px] text-zone-yellow font-medium">{asset.progressStage}</span>
                )}
                <span className="text-[10px] text-white-40">{formatElapsed(elapsed)}</span>
              </>
            ) : asset.status === 'FAILED' ? (
              <ImageOff className="w-8 h-8 text-accent-red" />
            ) : asset.assetType === 'video' ? (
              <Film className="w-8 h-8 text-white-20" />
            ) : (
              <ImageOff className="w-8 h-8 text-white-20" />
            )}
          </div>
        )}

        {/* Status badge */}
        <span
          className={cn(
            'absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium max-w-[60%] truncate',
            statusColor(asset.status)
          )}
          title={asset.progressStage ?? asset.status}
        >
          {asset.progressStage ?? asset.status}
        </span>

        {/* Source badge */}
        <span className={cn(
          'absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium',
          asset.source === 'IMPORTED'
            ? 'bg-zone-blue/20 text-zone-blue'
            : 'bg-white-10 text-white-60'
        )}>
          {asset.source === 'UPLOAD' ? 'Upload' : asset.source === 'IMPORTED' ? 'Imported' : 'AI'}
        </span>

        {/* Video duration badge */}
        {asset.assetType === 'video' && asset.videoDurationSec != null && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white-100 flex items-center gap-0.5">
            <Film className="w-2.5 h-2.5" /> {formatDuration(asset.videoDurationSec)}
          </span>
        )}

        {/* Attached indicator */}
        {asset.draftId && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zone-blue/20 text-zone-blue flex items-center gap-0.5">
            <Paperclip className="w-2.5 h-2.5" /> Attached
          </span>
        )}

        {/* Hover overlay with action buttons */}
        {asset.status === 'READY' && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onAttach(); }}
              className="p-2 rounded-full bg-white-10 text-white-100 hover:bg-zone-blue/30 hover:text-zone-blue transition-colors"
              title="Attach to post"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(); }}
              className="p-2 rounded-full bg-white-10 text-white-100 hover:bg-accent-green-110/30 hover:text-accent-green-110 transition-colors"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
              className="p-2 rounded-full bg-white-10 text-white-100 hover:bg-accent-red/30 hover:text-accent-red transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-xs text-white-100 font-medium truncate">
          {asset.filename || (asset.source === 'AI_GENERATED' ? 'AI Generated' : 'Untitled')}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-white-40">
          {asset.width && asset.height && (
            <span>{asset.width}x{asset.height}</span>
          )}
          {asset.bytes && <span>{formatBytes(asset.bytes)}</span>}
        </div>

        {/* Usage count */}
        <button
          onClick={onPreview}
          className={cn(
            'text-[10px] hover:underline',
            asset.usageCount > 0
              ? 'text-accent-green-110'
              : 'text-white-40'
          )}
        >
          {asset.usageCount > 0
            ? `Used in ${asset.usageCount} post${asset.usageCount !== 1 ? 's' : ''}`
            : 'Not used'}
        </button>

        {asset.status === 'FAILED' && asset.errorMessage && (
          <p className="text-[10px] text-accent-red truncate" title={asset.errorMessage}>
            {asset.errorMessage}
          </p>
        )}

        {/* Delete confirmation inline */}
        {isConfirmingDelete && (
          <div className="flex items-center gap-1 pt-1">
            <button
              onClick={onDeleteConfirm}
              disabled={isDeleting}
              className="text-[10px] px-1.5 py-0.5 rounded bg-accent-red text-white-100 hover:bg-accent-red/80 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Confirm'}
            </button>
            <button
              onClick={onDeleteCancel}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white-10 text-white-60 hover:bg-white-20"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
