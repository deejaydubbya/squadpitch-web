'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Home, Camera, Upload, Trash2, Star, Loader2, ArrowRight,
  ExternalLink, Calendar, Save, Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateLandingPageAction } from '@/components/sites/CreateLandingPageAction';
import {
  useUpdateDataItem,
  useUploadAsset,
  useCreateFolder,
  useFolders,
  autoTagAssetFetch,
  type WorkspaceDataItem,
} from '@/hooks/useSquadpitch';

// ── Types ────────────────────────────────────────────────────────────────

interface Props {
  item: WorkspaceDataItem;
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DetailField {
  key: string;
  label: string;
  multiline?: boolean;
  type?: string;
}

const DETAIL_FIELDS: DetailField[] = [
  { key: 'street', label: 'Street' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP' },
  { key: 'price', label: 'Price', type: 'number' },
  { key: 'status', label: 'Status' },
  { key: 'propertyType', label: 'Property Type' },
  { key: 'bedrooms', label: 'Bedrooms', type: 'number' },
  { key: 'bathrooms', label: 'Bathrooms', type: 'number' },
  { key: 'sqft', label: 'Sq Ft', type: 'number' },
  { key: 'lotSize', label: 'Lot Size' },
  { key: 'yearBuilt', label: 'Year Built' },
  { key: 'garage', label: 'Garage' },
  { key: 'agentName', label: 'Agent Name' },
  { key: 'brokerage', label: 'Brokerage' },
  { key: 'listingUrl', label: 'Listing URL' },
  { key: 'description', label: 'Description', multiline: true },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  sold: 'bg-red-500/20 text-red-400',
  coming_soon: 'bg-blue-500/20 text-blue-400',
  off_market: 'bg-white/10 text-white-40',
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

// ── Listing portal URL builders ──────────────────────────────────────────

function buildSearchUrls(d: Record<string, unknown>) {
  const street = String(d.street ?? '');
  const city = String(d.city ?? '');
  const state = String(d.state ?? '');
  const zip = String(d.zip ?? '');
  if (!street && !city) return { zillow: null, realtor: null, redfin: null };

  const zillowSlug = [street, city, state, zip]
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '');
  const zillow = zillowSlug
    ? `https://www.zillow.com/homes/${zillowSlug}_rb/`
    : null;

  const realtorSlug = street
    ? `${street.replace(/\s+/g, '_')}_${city}_${state}_${zip}`.replace(
        /[^a-zA-Z0-9_]/g,
        ''
      )
    : null;
  const realtor = realtorSlug
    ? `https://www.realtor.com/realestateandhomes-detail/${realtorSlug}`
    : null;

  const encoded = encodeURIComponent(
    [street, city, state, zip].filter(Boolean).join(', ')
  );
  const redfin = encoded
    ? `https://www.redfin.com/search#combined=${encoded}`
    : null;

  return { zillow, realtor, redfin };
}

// ── Component ────────────────────────────────────────────────────────────

export function PropertyDetailDrawer({ item, clientId, isOpen, onClose }: Props) {
  const router = useRouter();
  const d = item.dataJson as Record<string, unknown>;

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [editTitle, setEditTitle] = useState(item.title);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const updateItem = useUpdateDataItem(clientId);
  const uploadAsset = useUploadAsset(clientId);
  const createFolder = useCreateFolder(clientId);
  const { data: existingFolders } = useFolders(clientId);

  // Derived
  const images = (d.images as string[] | undefined) ?? [];
  const heroUrl = (d.imageUrl as string | undefined) ?? images[0] ?? null;
  const allImages = heroUrl
    ? [heroUrl, ...images.filter((u) => u !== heroUrl)]
    : [...images];

  const address = (() => {
    if (item.title && item.title !== 'Untitled Listing') return item.title;
    return [d.street, d.city, d.state, d.zip].filter(Boolean).join(', ') || 'Unknown address';
  })();

  const status = (d.status as string) ?? '';
  const statusLabel = status.replace(/_/g, ' ');
  const statusClass = STATUS_COLORS[status] ?? 'bg-white/10 text-white-40';

  const searchUrls = buildSearchUrls(d);

  // ── Edit handlers ────────────────────────────────────────────────────

  const startEditing = () => {
    const data: Record<string, string> = {};
    for (const f of DETAIL_FIELDS) {
      const val = d[f.key];
      data[f.key] = val != null ? String(val) : '';
    }
    setEditData(data);
    setEditTitle(item.title);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditData({});
  };

  const saveEdits = () => {
    const newDataJson = { ...d };
    for (const f of DETAIL_FIELDS) {
      const val = editData[f.key]?.trim();
      if (val) {
        newDataJson[f.key] = f.type === 'number' ? Number(val) || val : val;
      } else {
        delete newDataJson[f.key];
      }
    }
    updateItem.mutate(
      {
        id: item.id,
        title: editTitle.trim() || item.title,
        dataJson: newDataJson,
      },
      { onSuccess: () => setEditing(false) }
    );
  };

  // ── Upload handler ───────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      setUploadProgress({ done: 0, total: files.length });

      const street = String(d.street ?? '');
      const city = String(d.city ?? '');
      const folderName = street
        ? `Property — ${street}${city ? `, ${city}` : ''}`
        : `Property — ${item.title || 'Untitled'}`;

      try {
        // Find or create folder
        let folderId: string | undefined;
        const existing = existingFolders?.find((f) => f.name === folderName);
        if (existing) {
          folderId = existing.id;
        } else {
          const folder = await createFolder.mutateAsync(folderName);
          folderId = folder.id;
        }

        const newUrls: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const fd = new FormData();
            fd.append('file', file);
            const asset = await uploadAsset.mutateAsync({
              formData: fd,
              assetType: 'image',
              folderId,
            });
            if (asset.url) {
              newUrls.push(asset.url);
              // Fire-and-forget auto-tag
              autoTagAssetFetch(clientId, asset.id);
            }
          } catch {
            // Skip failed uploads
          }
          setUploadProgress({ done: i + 1, total: files.length });
        }

        if (newUrls.length > 0) {
          const updatedImages = [...allImages, ...newUrls];
          const newDataJson = {
            ...d,
            images: updatedImages,
            imageUrl: d.imageUrl ?? newUrls[0],
          };
          updateItem.mutate({ id: item.id, dataJson: newDataJson });
        }
      } catch {
        // Folder creation failed
      } finally {
        setUploading(false);
        setUploadProgress({ done: 0, total: 0 });
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [d, item, clientId, allImages, existingFolders, createFolder, uploadAsset, updateItem]
  );

  const handleRemoveImage = (url: string) => {
    const filtered = allImages.filter((u) => u !== url);
    const newDataJson = {
      ...d,
      images: filtered,
      imageUrl: filtered[0] ?? null,
    };
    updateItem.mutate({ id: item.id, dataJson: newDataJson });
  };

  const handleSetHero = (url: string) => {
    const newDataJson = { ...d, imageUrl: url };
    updateItem.mutate({ id: item.id, dataJson: newDataJson });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Property details">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer panel */}
      <div className="safe-area-top safe-area-bottom relative flex h-dvh w-full max-w-xl flex-col border-l border-white-10 bg-sp-bg shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white-10">
          <div className="flex items-center gap-2 min-w-0">
            <Home className="w-4 h-4 text-teal-400 shrink-0" />
            <h2 className="text-base font-bold text-white-100 truncate">{address}</h2>
            {statusLabel && (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  statusClass
                )}
              >
                {statusLabel}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-white-40 transition-colors hover:bg-white/5 hover:text-white-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* ── Photo Management ────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-white-60 uppercase tracking-wider">
                Photos {allImages.length > 0 && `(${allImages.length})`}
              </h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs font-medium text-accent-green-110 hover:text-accent-green-130 transition-colors disabled:opacity-50"
              >
                <Upload className="w-3 h-3" /> Upload
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

            {/* Upload progress */}
            {uploading && (
              <div className="mb-3 flex items-center gap-2 text-xs text-white-40">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading {uploadProgress.done}/{uploadProgress.total}...
              </div>
            )}

            {/* Photo grid or drop zone */}
            {allImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {allImages.map((url, i) => (
                  <div
                    key={url}
                    className="relative group rounded-lg overflow-hidden border border-white-10 bg-white/[0.02]"
                  >
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    {/* Hero badge */}
                    {url === heroUrl && (
                      <span className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/80 text-[9px] font-bold text-black">
                        <Star className="w-2.5 h-2.5" /> Cover
                      </span>
                    )}
                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {url !== heroUrl && (
                        <button
                          onClick={() => handleSetHero(url)}
                          className="p-1.5 rounded-md bg-black/60 text-yellow-400 hover:bg-black/80 transition-colors"
                          title="Set as cover photo"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveImage(url)}
                        className="p-1.5 rounded-md bg-black/60 text-red-400 hover:bg-black/80 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-white-10 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white-20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Camera className="w-8 h-8 text-white-20" />
                <p className="text-sm text-white-40">
                  Drop images here or click to upload
                </p>
              </div>
            )}
          </section>

          {/* ── Find Listing Photos ──────────────────────────────── */}
          {(String(d.listingUrl ?? '') || String(d.street ?? '') || String(d.city ?? '')) ? (
            <section className="px-4 py-3 rounded-lg bg-white-5 border border-white-10 space-y-2">
              <p className="text-xs font-semibold text-white-60 uppercase tracking-wider">
                Find listing photos
              </p>
              <p className="text-xs text-white-40">
                Open the listing page to grab property photos, then upload them here.
              </p>
              <div className="flex flex-wrap gap-2">
                {typeof d.listingUrl === 'string' && d.listingUrl && (
                  <a
                    href={d.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-xs text-accent-green-110 hover:bg-accent-green-110/20 transition-colors font-medium"
                  >
                    <ExternalLink className="w-3 h-3" /> Original listing
                  </a>
                )}
                {searchUrls.zillow && (
                  <a
                    href={searchUrls.zillow}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-5 text-xs text-white-60 hover:bg-white-10 hover:text-white-100 transition-colors font-medium border border-white-10"
                  >
                    <ExternalLink className="w-3 h-3" /> Search Zillow
                  </a>
                )}
                {searchUrls.realtor && (
                  <a
                    href={searchUrls.realtor}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-5 text-xs text-white-60 hover:bg-white-10 hover:text-white-100 transition-colors font-medium border border-white-10"
                  >
                    <ExternalLink className="w-3 h-3" /> Search Realtor.com
                  </a>
                )}
                {searchUrls.redfin && (
                  <a
                    href={searchUrls.redfin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-5 text-xs text-white-60 hover:bg-white-10 hover:text-white-100 transition-colors font-medium border border-white-10"
                  >
                    <ExternalLink className="w-3 h-3" /> Search Redfin
                  </a>
                )}
              </div>
            </section>
          ) : null}

          {/* ── Property Details ──────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-white-60 uppercase tracking-wider">
                Property Details
              </h3>
              {editing ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelEditing}
                    className="text-xs text-white-40 hover:text-white-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdits}
                    disabled={updateItem.isPending}
                    className="flex items-center gap-1 text-xs font-medium text-accent-green-110 hover:text-accent-green-130 transition-colors disabled:opacity-50"
                  >
                    {updateItem.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1 text-xs text-white-40 hover:text-white-100 transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="block text-xs text-white-40 mb-1">Title</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
                  />
                </div>
                {DETAIL_FIELDS.map((f) =>
                  f.multiline ? (
                    <div key={f.key}>
                      <label className="block text-xs text-white-40 mb-1">{f.label}</label>
                      <textarea
                        value={editData[f.key] ?? ''}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
                      />
                    </div>
                  ) : (
                    <div key={f.key}>
                      <label className="block text-xs text-white-40 mb-1">{f.label}</label>
                      <input
                        value={editData[f.key] ?? ''}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                        type={f.type === 'number' ? 'number' : 'text'}
                        className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
                      />
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Quick stats row */}
                <div className="flex flex-wrap gap-3 mb-2">
                  {typeof d.price === 'number' && (
                    <div className="text-base font-semibold text-white-100">
                      {fmtCurrency(d.price)}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {DETAIL_FIELDS.map((f) => {
                    const val = d[f.key];
                    if (val == null || val === '') return null;
                    return (
                      <div key={f.key} className={f.multiline ? 'col-span-2' : ''}>
                        <span className="text-[10px] text-white-30 uppercase tracking-wider">
                          {f.label}
                        </span>
                        <p className="text-sm text-white-100 break-words">
                          {f.key === 'price' && typeof val === 'number'
                            ? fmtCurrency(val)
                            : f.key === 'listingUrl'
                              ? (
                                  <a
                                    href={String(val)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent-green-110 hover:underline"
                                  >
                                    {String(val).slice(0, 60)}
                                    {String(val).length > 60 ? '...' : ''}
                                  </a>
                                )
                              : String(val)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white-10 flex items-center gap-3">
          <button
            onClick={() => {
              router.push(
                `/workspaces/${clientId}/create?intent=campaign&sourceType=property&sourceId=${item.id}`,
              );
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
          >
            New Campaign <ArrowRight className="w-4 h-4" />
          </button>
          <CreateLandingPageAction
            clientId={clientId}
            sourceType="PROPERTY"
            sourceId={item.id}
            pageGoal="LISTING"
            variant="button-ghost"
          />
        </div>
      </div>
    </div>
  );
}
