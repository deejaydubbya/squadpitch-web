'use client';

import { useState } from 'react';
import {
  X,
  Paperclip,
  Wand2,
  Download,
  Copy,
  Trash2,
  Film,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type MediaAsset,
  type Channel,
  useAssetUsage,
  useDeleteAsset,
  useGeneratePostFromAsset,
} from '@/hooks/useSquadpitch';

interface Props {
  asset: MediaAsset;
  clientId: string;
  onClose: () => void;
  onAttach: () => void;
}

const CHANNELS: Channel[] = ['INSTAGRAM', 'TIKTOK', 'X', 'LINKEDIN', 'FACEBOOK', 'YOUTUBE'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AssetPreviewModal({ asset, clientId, onClose, onAttach }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  const { data: usageDrafts } = useAssetUsage(asset.id);
  const deleteAsset = useDeleteAsset(clientId);
  const generatePost = useGeneratePostFromAsset(clientId);

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!asset.url) return;
    setDownloading(true);
    try {
      const res = await fetch(asset.url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = asset.filename || 'download';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback: open in new tab
      window.open(asset.url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = () => {
    if (asset.url) {
      navigator.clipboard.writeText(asset.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = () => {
    deleteAsset.mutate(asset.id, { onSuccess: onClose });
  };

  const handleGeneratePost = (channel: Channel) => {
    generatePost.mutate(
      { assetId: asset.id, channel },
      { onSuccess: () => { setShowChannelPicker(false); onClose(); } }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] mx-4 bg-sp-surface rounded-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white-10 text-white-60 hover:bg-white-20 hover:text-white-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Preview area */}
        <div className="flex-1 min-h-[300px] md:min-h-0 bg-black flex items-center justify-center p-4">
          {asset.assetType === 'video' && asset.url ? (
            <video
              src={asset.url}
              controls
              className="max-w-full max-h-[70vh] rounded-lg"
              poster={asset.thumbnailUrl ?? undefined}
            />
          ) : asset.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.url}
              alt={asset.altText || asset.filename || 'Asset preview'}
              className="max-w-full max-h-[70vh] rounded-lg object-contain"
            />
          ) : (
            <div className="text-white-40 text-sm">No preview available</div>
          )}
        </div>

        {/* Info panel */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white-10 p-5 overflow-y-auto space-y-5">
          {/* Title */}
          <h3 className="text-sm font-semibold text-white-100 truncate">
            {asset.filename || (asset.source === 'AI_GENERATED' ? 'AI Generated' : 'Untitled')}
          </h3>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white-10 text-white-60">
              {asset.assetType === 'video' ? 'Video' : 'Image'}
            </span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium',
              asset.source === 'AI_GENERATED'
                ? 'bg-purple-500/20 text-purple-400'
                : asset.source === 'IMPORTED'
                  ? 'bg-zone-yellow/20 text-zone-yellow'
                  : 'bg-zone-blue/20 text-zone-blue'
            )}>
              {asset.source === 'AI_GENERATED' ? 'AI' : asset.source === 'IMPORTED' ? 'Imported' : 'Upload'}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs text-white-40">
            <div className="flex justify-between">
              <span>Created</span>
              <span className="text-white-60">{formatDate(asset.createdAt)}</span>
            </div>
            {asset.width && asset.height && (
              <div className="flex justify-between">
                <span>Dimensions</span>
                <span className="text-white-60">{asset.width} x {asset.height}</span>
              </div>
            )}
            {asset.bytes && (
              <div className="flex justify-between">
                <span>File size</span>
                <span className="text-white-60">{formatBytes(asset.bytes)}</span>
              </div>
            )}
          </div>

          {/* AI prompt */}
          {asset.renderedPrompt && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Prompt</span>
              <p className="text-xs text-white-60 bg-white-5 rounded-lg p-2 max-h-24 overflow-y-auto">
                {asset.renderedPrompt}
              </p>
            </div>
          )}

          {/* Usage */}
          <div className="space-y-2">
            <span className="text-[10px] font-medium text-white-40 uppercase tracking-wider">Usage</span>
            {asset.usageCount > 0 ? (
              <div className="space-y-1">
                <p className="text-xs text-accent-green-110">
                  Used in {asset.usageCount} post{asset.usageCount !== 1 ? 's' : ''}
                </p>
                {usageDrafts?.map((d) => (
                  <div
                    key={d.id}
                    className="text-[10px] text-white-60 bg-white-5 rounded px-2 py-1 truncate flex items-center gap-1"
                  >
                    <span className="text-white-40">{d.channel}</span>
                    <span className="truncate">{d.bodySnippet}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white-40">Not used in any posts</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-white-10">
            <button
              onClick={onAttach}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zone-blue/20 text-zone-blue text-xs font-medium hover:bg-zone-blue/30 transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5" /> Attach to post
            </button>

            <div className="relative">
              <button
                onClick={() => setShowChannelPicker((v) => !v)}
                disabled={generatePost.isPending}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50"
              >
                {generatePost.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                Generate post
              </button>
              {showChannelPicker && (
                <div className="absolute left-0 right-0 mt-1 bg-sp-surface border border-white-10 rounded-xl p-1.5 space-y-0.5 z-10 shadow-lg">
                  <p className="text-[10px] text-white-40 px-2 py-1">Select channel:</p>
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch}
                      onClick={() => handleGeneratePost(ch)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-white-10 text-white-60 hover:text-white-100 transition-colors"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {asset.url && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {downloading ? 'Downloading...' : 'Download'}
              </button>
            )}

            <button
              onClick={handleCopy}
              disabled={!asset.url}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy URL'}
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-red/10 text-accent-red text-xs font-medium hover:bg-accent-red/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleteAsset.isPending}
                  className="flex-1 px-3 py-2 rounded-lg bg-accent-red text-white-100 text-xs font-medium hover:bg-accent-red/80 disabled:opacity-50"
                >
                  {deleteAsset.isPending ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
