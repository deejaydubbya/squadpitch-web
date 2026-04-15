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
  X,
  Plus,
  Download,
  Cloud,
  ChevronDown,
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
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { useUsage } from '@/hooks/useBilling';
import { AssetPreviewModal } from './AssetPreviewModal';
import { AttachToPostModal } from './AttachToPostModal';
import { CloudImportExport } from './CloudImportExport';

interface Props {
  clientId: string;
}

const SOURCE_OPTIONS: { label: string; value: MediaAssetSource | 'ALL' }[] = [
  { label: 'All sources', value: 'ALL' },
  { label: 'Uploads', value: 'UPLOAD' },
  { label: 'AI Generated', value: 'AI_GENERATED' },
  { label: 'Imported', value: 'IMPORTED' },
];

const STATUS_OPTIONS: { label: string; value: MediaAssetStatus | 'ALL' }[] = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Ready', value: 'READY' },
  { label: 'Generating', value: 'GENERATING' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
];

const TYPE_OPTIONS: { label: string; value: MediaAssetType | 'ALL' }[] = [
  { label: 'All types', value: 'ALL' },
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

  // Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showFab, setShowFab] = useState(false);

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

  // ── Usage / billing ──────────────────────────────────────────────
  const { data: usage } = useUsage();

  // ── Mutations ─────────────────────────────────────────────────────
  const uploadAsset = useUploadAsset(clientId);
  const deleteAsset = useDeleteAsset(clientId);
  const generateMedia = useGenerateMedia(clientId);
  const generateVideo = useGenerateVideo(clientId);

  // ── Upload ────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          setShowUploadModal(false);
        },
      });
    },
    [uploadAsset, uploadAltText, uploadCaption, uploadMode]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
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
            setShowGenerateModal(false);
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
            setShowGenerateModal(false);
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

  const handleDownloadAsset = async (asset: MediaAsset) => {
    if (!asset.url) return;
    try {
      const res = await fetch(asset.url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = asset.filename || 'download';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(asset.url, '_blank');
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Row 1: Search + action buttons */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-40" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          />
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white-10 text-white-80 text-sm font-medium hover:bg-white-20 transition-colors flex-shrink-0"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
        <button
          onClick={() => setShowCloudModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white-10 text-white-80 text-sm font-medium hover:bg-white-20 transition-colors flex-shrink-0"
        >
          <Cloud className="w-4 h-4" />
          Import
        </button>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-green-110 text-sp-dark text-sm font-medium hover:bg-accent-green-110/90 transition-colors flex-shrink-0"
        >
          <Wand2 className="w-4 h-4" />
          Generate
        </button>
      </div>

      {/* Row 2: Compact dropdown filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <CompactSelect
          value={sourceFilter}
          options={SOURCE_OPTIONS}
          onChange={(v) => setSourceFilter(v as MediaAssetSource | 'ALL')}
        />
        <CompactSelect
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(v) => setStatusFilter(v as MediaAssetStatus | 'ALL')}
        />
        <CompactSelect
          value={typeFilter}
          options={TYPE_OPTIONS}
          onChange={(v) => setTypeFilter(v as MediaAssetType | 'ALL')}
        />
      </div>

      {/* Polling indicator */}
      {hasInProgress && (
        <div className="flex items-center gap-2 text-xs text-zone-yellow">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Assets are being processed — auto-refreshing...
        </div>
      )}

      {/* Loading / error state */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading assets...</span>
        </div>
      )}
      {error && <StatusBanner error={(error as Error).message} />}

      {/* Asset grid — immediately after toolbar */}
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
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 rounded-lg bg-white-10 text-white-60 text-sm font-medium hover:bg-white-20 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Upload
                </button>
                <button
                  onClick={() => { setGenMode('image'); setShowGenerateModal(true); }}
                  className="px-4 py-2 rounded-lg bg-accent-green-110 text-sp-dark text-sm font-medium hover:bg-accent-green-110/90 flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" /> Generate Image
                </button>
                <button
                  onClick={() => { setGenMode('video'); setShowGenerateModal(true); }}
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
                  onDownload={() => handleDownloadAsset(asset)}
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

      {/* ── Floating action button ─────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-40">
        {showFab && (
          <div className="absolute bottom-14 right-0 w-48 rounded-xl bg-sp-surface border border-white-10 shadow-2xl shadow-black/40 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <button
              onClick={() => { setUploadMode('image'); setShowUploadModal(true); setShowFab(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white-60 hover:text-white-100 hover:bg-white-10 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Image
            </button>
            <button
              onClick={() => { setUploadMode('video'); setShowUploadModal(true); setShowFab(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white-60 hover:text-white-100 hover:bg-white-10 transition-colors"
            >
              <Video className="w-3.5 h-3.5" /> Upload Video
            </button>
            <div className="border-t border-white-10 my-0.5" />
            <button
              onClick={() => { setGenMode('image'); setShowGenerateModal(true); setShowFab(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white-60 hover:text-white-100 hover:bg-white-10 transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" /> Generate Image
            </button>
            <button
              onClick={() => { setGenMode('video'); setShowGenerateModal(true); setShowFab(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white-60 hover:text-white-100 hover:bg-white-10 transition-colors"
            >
              <Film className="w-3.5 h-3.5" /> Generate Video
            </button>
            <div className="border-t border-white-10 my-0.5" />
            <button
              onClick={() => { setShowCloudModal(true); setShowFab(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white-60 hover:text-white-100 hover:bg-white-10 transition-colors"
            >
              <Cloud className="w-3.5 h-3.5" /> Import from Cloud
            </button>
          </div>
        )}
        <button
          onClick={() => setShowFab((v) => !v)}
          className={cn(
            'w-12 h-12 rounded-full shadow-lg shadow-black/30 flex items-center justify-center transition-all',
            showFab
              ? 'bg-white-20 text-white-100 rotate-45'
              : 'bg-accent-green-110 text-sp-dark hover:bg-accent-green-110/90'
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Close FAB when clicking outside */}
      {showFab && (
        <div className="fixed inset-0 z-30" onClick={() => setShowFab(false)} />
      )}

      {/* ── Upload Modal ───────────────────────────────────────────── */}
      {showUploadModal && (
        <ModalOverlay onClose={() => setShowUploadModal(false)}>
          <div className="w-full max-w-md mx-4 bg-sp-surface rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white-100 flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Media
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded hover:bg-white-10 text-white-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image / Video toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setUploadMode('image')}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  uploadMode === 'image'
                    ? 'bg-accent-green-110 text-sp-dark'
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
                    ? 'bg-accent-green-110 text-sp-dark'
                    : 'bg-white-10 text-white-60 hover:bg-white-20'
                )}
              >
                Video
              </button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-white-10 bg-white-5 hover:border-white-20"
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
        </ModalOverlay>
      )}

      {/* ── Generate Modal ─────────────────────────────────────────── */}
      {showGenerateModal && (
        <ModalOverlay onClose={() => setShowGenerateModal(false)}>
          <div className="w-full max-w-md mx-4 bg-sp-surface rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white-100 flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> AI Generate
              </h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 rounded hover:bg-white-10 text-white-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image / Video toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setGenMode('image')}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  genMode === 'image'
                    ? 'bg-accent-green-110 text-sp-dark'
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
                    ? 'bg-accent-green-110 text-sp-dark'
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
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
            />

            <div>
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
              className="w-full px-4 py-2.5 rounded-lg bg-accent-green-110 text-sp-dark text-sm font-medium hover:bg-accent-green-110/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Generate {genMode === 'video' ? 'Video' : 'Image'}
            </button>

            {generateError && (
              <StatusBanner error={(generateError as Error).message} />
            )}

            {/* Usage remaining */}
            {usage && (
              <>
                <p className="text-xs text-white-40 text-center">
                  {genMode === 'image'
                    ? `${Math.max(0, (usage.limits.images ?? 0) - (usage.usage.images ?? 0))} of ${usage.limits.images ?? 0} image generations remaining`
                    : `${Math.max(0, (usage.limits.videos ?? 0) - (usage.usage.videos ?? 0))} of ${usage.limits.videos ?? 0} video generations remaining`}
                </p>
                {((genMode === 'image' && usage.usage.images >= usage.limits.images) ||
                  (genMode === 'video' && usage.usage.videos >= usage.limits.videos)) && (
                  <UpgradePrompt
                    currentTier={usage.tier}
                    limitType={genMode === 'video' ? 'Video' : 'Image'}
                  />
                )}
              </>
            )}
          </div>
        </ModalOverlay>
      )}

      {/* ── Cloud Import Modal ─────────────────────────────────────── */}
      {showCloudModal && (
        <ModalOverlay onClose={() => setShowCloudModal(false)}>
          <div className="w-full max-w-2xl mx-4 bg-sp-surface rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white-100 flex items-center gap-2">
                <Cloud className="w-4 h-4" /> Import from Cloud
              </h3>
              <button
                onClick={() => setShowCloudModal(false)}
                className="p-1 rounded hover:bg-white-10 text-white-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CloudImportExport clientId={clientId} assets={assets} />
          </div>
        </ModalOverlay>
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

// ── Shared modal overlay ──────────────────────────────────────────────

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ── Compact dropdown select ───────────────────────────────────────────

function CompactSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{ colorScheme: 'dark' }}
        className="appearance-none pl-2.5 pr-7 py-1.5 rounded-lg bg-white-5 border border-white-10 text-xs text-white-80 font-medium focus:outline-none focus:border-accent-green-110 cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white-40 pointer-events-none" />
    </div>
  );
}

// ── Asset Card sub-component ──────────────────────────────────────────

interface AssetCardProps {
  asset: MediaAsset;
  onPreview: () => void;
  onAttach: () => void;
  onDownload: () => void;
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
  onDownload,
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
              title="Use in post"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="p-2 rounded-full bg-white-10 text-white-100 hover:bg-white-20 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
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
