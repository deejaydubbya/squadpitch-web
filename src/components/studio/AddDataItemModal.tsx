'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, ImageIcon, Trash2, Upload, FolderOpen, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useClient,
  useCreateDataItem,
  useUpdateDataItem,
  useBusinessDataLabels,
  useAssets,
  useUploadAsset,
  type WorkspaceDataItem,
  type DataItemType,
  type MediaAsset,
} from '@/hooks/useSquadpitch';
import { StatusBanner } from '@/components/common/StatusBanner';

function getDataItemTypes(launchLabel: string, isRealEstate = false): { value: DataItemType; label: string }[] {
  if (isRealEstate) {
    return [
      { value: 'CUSTOM', label: 'New Listing' },
      { value: 'TESTIMONIAL', label: 'Testimonial' },
      { value: 'STATISTIC', label: 'Market Stat' },
      { value: 'TEAM_SPOTLIGHT', label: 'Team Spotlight' },
      { value: 'MILESTONE', label: 'Milestone' },
      { value: 'EVENT', label: 'Open House / Event' },
      { value: 'CASE_STUDY', label: 'Success Story' },
      { value: 'PROMOTION', label: 'Promotion' },
      { value: 'FAQ', label: 'FAQ' },
      { value: 'INDUSTRY_NEWS', label: 'Market News' },
      { value: 'PRODUCT_LAUNCH', label: launchLabel },
    ];
  }
  return [
    { value: 'TESTIMONIAL', label: 'Testimonial' },
    { value: 'CASE_STUDY', label: 'Case Study' },
    { value: 'PRODUCT_LAUNCH', label: launchLabel },
    { value: 'PROMOTION', label: 'Promotion' },
    { value: 'STATISTIC', label: 'Statistic' },
    { value: 'MILESTONE', label: 'Milestone' },
    { value: 'FAQ', label: 'FAQ' },
    { value: 'TEAM_SPOTLIGHT', label: 'Team Spotlight' },
    { value: 'INDUSTRY_NEWS', label: 'Industry News' },
    { value: 'EVENT', label: 'Event' },
    { value: 'CUSTOM', label: 'Custom' },
  ];
}

interface TypeField {
  key: string;
  label: string;
  multiline?: boolean;
}

const RE_LISTING_FIELDS: TypeField[] = [
  { key: 'street', label: 'Street Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP Code' },
  { key: 'price', label: 'Price' },
  { key: 'bedrooms', label: 'Bedrooms' },
  { key: 'bathrooms', label: 'Bathrooms' },
  { key: 'sqft', label: 'Sq Ft' },
  { key: 'propertyType', label: 'Property Type' },
  { key: 'status', label: 'Status (active/pending/sold)' },
  { key: 'listingUrl', label: 'Listing URL' },
  { key: 'agentName', label: 'Agent Name' },
  { key: 'brokerage', label: 'Brokerage' },
  { key: 'yearBuilt', label: 'Year Built' },
  { key: 'description', label: 'Description', multiline: true },
];

const TYPE_FIELDS: Record<string, TypeField[]> = {
  TESTIMONIAL: [
    { key: 'quote', label: 'Quote', multiline: true },
    { key: 'author', label: 'Author' },
    { key: 'role', label: 'Role / Title' },
    { key: 'result', label: 'Result / Outcome' },
  ],
  CASE_STUDY: [
    { key: 'client', label: 'Client Name' },
    { key: 'challenge', label: 'Challenge', multiline: true },
    { key: 'solution', label: 'Solution', multiline: true },
    { key: 'result', label: 'Result', multiline: true },
  ],
  PRODUCT_LAUNCH: [
    { key: 'productName', label: 'Product Name' },
    { key: 'launchDate', label: 'Launch Date' },
    { key: 'features', label: 'Key Features', multiline: true },
    { key: 'pricing', label: 'Pricing' },
  ],
  PROMOTION: [
    { key: 'offer', label: 'Offer Details', multiline: true },
    { key: 'deadline', label: 'Deadline' },
    { key: 'code', label: 'Promo Code' },
    { key: 'terms', label: 'Terms' },
  ],
  STATISTIC: [
    { key: 'metric', label: 'Metric Name' },
    { key: 'value', label: 'Value' },
    { key: 'context', label: 'Context', multiline: true },
  ],
  MILESTONE: [
    { key: 'achievement', label: 'Achievement' },
    { key: 'date', label: 'Date' },
    { key: 'significance', label: 'Significance', multiline: true },
  ],
  FAQ: [
    { key: 'question', label: 'Question' },
    { key: 'answer', label: 'Answer', multiline: true },
  ],
  TEAM_SPOTLIGHT: [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'bio', label: 'Bio', multiline: true },
    { key: 'funFact', label: 'Fun Fact' },
  ],
  INDUSTRY_NEWS: [
    { key: 'headline', label: 'Headline' },
    { key: 'source', label: 'Source' },
    { key: 'takeaway', label: 'Our Takeaway', multiline: true },
  ],
  EVENT: [
    { key: 'eventName', label: 'Event Name' },
    { key: 'date', label: 'Date' },
    { key: 'location', label: 'Location' },
    { key: 'details', label: 'Details', multiline: true },
  ],
};

interface Props {
  clientId: string;
  editItem?: WorkspaceDataItem | null;
  onClose: () => void;
}

export function AddDataItemModal({ clientId, editItem, onClose }: Props) {
  const isEdit = Boolean(editItem);
  const { data: client } = useClient(clientId);
  const isRE = client?.industryKey === 'real_estate';
  const bdLabels = useBusinessDataLabels(clientId);
  const create = useCreateDataItem(clientId);
  const update = useUpdateDataItem(clientId);
  const uploadAsset = useUploadAsset(clientId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<DataItemType>(editItem?.type ?? (isRE ? 'CUSTOM' : 'TESTIMONIAL'));
  const [title, setTitle] = useState(editItem?.title ?? '');
  const [summary, setSummary] = useState(editItem?.summary ?? '');
  const [dataJson, setDataJson] = useState<Record<string, string>>(
    (editItem?.dataJson as Record<string, string>) ?? {}
  );

  // Image state — supports multiple images
  const editDataJson = editItem?.dataJson as Record<string, unknown> | undefined;
  const initImages = (() => {
    const urls: string[] = [];
    const arr = editDataJson?.images;
    if (Array.isArray(arr)) urls.push(...(arr as string[]));
    const hero = editDataJson?.imageUrl as string | undefined;
    if (hero && !urls.includes(hero)) urls.unshift(hero);
    return urls;
  })();
  const [images, setImages] = useState<string[]>(initImages);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [tags, setTags] = useState(editItem?.tags.join(', ') ?? '');
  const [priority, setPriority] = useState(editItem?.priority ?? 0);
  const [expiresAt, setExpiresAt] = useState(
    editItem?.expiresAt ? editItem.expiresAt.slice(0, 10) : ''
  );

  useEffect(() => {
    if (!isEdit) setDataJson({});
  }, [type, isEdit]);

  const setField = (key: string, value: string) => {
    setDataJson((prev) => ({ ...prev, [key]: value }));
  };

  const addImageUrl = () => {
    const url = imageUrlInput.trim();
    if (url && !images.includes(url)) {
      setImages((prev) => [...prev, url]);
      setImageUrlInput('');
      setShowUrlInput(false);
    }
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append('file', files[i]);
        try {
          const asset = await uploadAsset.mutateAsync({ formData: fd, assetType: 'image' });
          if (asset.url) {
            setImages((prev) => [...prev, asset.url!]);
          }
        } catch {
          // skip failed
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const pickFromLibrary = (asset: MediaAsset) => {
    if (asset.url && !images.includes(asset.url)) {
      setImages((prev) => [...prev, asset.url!]);
    }
  };

  const fields = (isRE && type === 'CUSTOM') ? RE_LISTING_FIELDS : (TYPE_FIELDS[type] ?? []);
  const isPending = create.isPending || update.isPending;
  const error = create.error || update.error;

  const handleSave = () => {
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const finalDataJson = { ...dataJson };
    if (images.length > 0) {
      finalDataJson.imageUrl = images[0];
      (finalDataJson as Record<string, unknown>).images = images;
    } else {
      delete finalDataJson.imageUrl;
      delete (finalDataJson as Record<string, unknown>).images;
    }
    const body = {
      type,
      title: title.trim(),
      summary: summary.trim() || null,
      dataJson: finalDataJson,
      tags: parsedTags,
      priority,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    if (isEdit && editItem) {
      update.mutate(
        { id: editItem.id, ...body },
        { onSuccess: () => onClose() }
      );
    } else {
      create.mutate(body, { onSuccess: () => onClose() });
    }
  };

  const canSave = title.trim().length > 0 && !isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-sp-bg border border-white-10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white-100">
            {isEdit ? `Edit ${bdLabels.itemSingular}` : `Add ${bdLabels.itemSingular}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
              Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {getDataItemTypes(bdLabels.launchLabel, isRE).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    type === t.value
                      ? 'bg-accent-green-110 text-sp-surface'
                      : 'bg-white-10 text-white-60 hover:bg-white-20'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isRE ? 'e.g. 123 Oak Street, 4BR/3BA' : "e.g. Sarah's 50% productivity increase"}
              maxLength={200}
              className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
              Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description..."
              rows={2}
              maxLength={2000}
              className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none placeholder:text-white-30"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
              Images {images.length > 0 && `(${images.length})`}
            </label>

            {/* Image thumbnails */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {images.map((url, i) => (
                  <div key={url} className="relative group w-16 h-16 rounded-lg overflow-hidden bg-white-5 border border-white-10">
                    <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-yellow-500/80 text-[8px] font-bold text-black">
                        Hero
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add image actions */}
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-xs text-white-60 hover:bg-white-10 hover:text-white-100 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Upload
              </button>
              <button
                type="button"
                onClick={() => setShowLibraryPicker(!showLibraryPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-xs text-white-60 hover:bg-white-10 hover:text-white-100 transition-colors"
              >
                <FolderOpen className="w-3 h-3" /> From library
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-xs text-white-60 hover:bg-white-10 hover:text-white-100 transition-colors"
              >
                <Plus className="w-3 h-3" /> Paste URL
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>

            {/* URL input */}
            {showUrlInput && (
              <div className="flex gap-2 mb-2">
                <input
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addImageUrl()}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
                />
                <button
                  type="button"
                  onClick={addImageUrl}
                  disabled={!imageUrlInput.trim()}
                  className="px-3 py-2 rounded-lg bg-accent-green-110 text-sp-surface text-xs font-medium hover:bg-accent-green-120 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}

            {/* Mini library picker */}
            {showLibraryPicker && (
              <MiniMediaPicker clientId={clientId} onPick={pickFromLibrary} existingUrls={images} />
            )}
          </div>

          {/* Type-specific fields */}
          {fields.length > 0 && (
            <div className="border-t border-white-10 pt-4">
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-3">
                Details
              </label>
              <div className="space-y-3">
                {fields.map((f) =>
                  f.multiline ? (
                    <div key={f.key}>
                      <label className="block text-xs text-white-40 mb-1">
                        {f.label}
                      </label>
                      <textarea
                        value={dataJson[f.key] ?? ''}
                        onChange={(e) => setField(f.key, e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none placeholder:text-white-30"
                      />
                    </div>
                  ) : (
                    <div key={f.key}>
                      <label className="block text-xs text-white-40 mb-1">
                        {f.label}
                      </label>
                      <input
                        value={dataJson[f.key] ?? ''}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
              Tags (comma-separated)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. productivity, customer-win, Q1"
              className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
            />
          </div>

          {/* Priority + Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
                Priority (0-10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
                Expires
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
              />
            </div>
          </div>

          {error && <StatusBanner error={(error as Error).message} />}

          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              'Update Item'
            ) : (
              'Add Item'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mini Media Library Picker ────────────────────────────────────────────

function MiniMediaPicker({
  clientId,
  onPick,
  existingUrls,
}: {
  clientId: string;
  onPick: (asset: MediaAsset) => void;
  existingUrls: string[];
}) {
  const { data: assets, isLoading } = useAssets(clientId, { status: 'READY' });
  const imageAssets = assets?.filter((a) => a.assetType === 'image' && a.url) ?? [];

  return (
    <div className="rounded-lg border border-white-10 bg-white/[0.02] p-2 max-h-48 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 text-white-20 animate-spin" />
        </div>
      ) : imageAssets.length === 0 ? (
        <p className="text-xs text-white-30 text-center py-3">No images in your library yet.</p>
      ) : (
        <div className="grid grid-cols-5 gap-1.5">
          {imageAssets.slice(0, 30).map((asset) => {
            const alreadyAdded = existingUrls.includes(asset.url!);
            return (
              <button
                key={asset.id}
                type="button"
                disabled={alreadyAdded}
                onClick={() => onPick(asset)}
                className={cn(
                  'relative rounded-md overflow-hidden aspect-square border transition-colors',
                  alreadyAdded
                    ? 'border-accent-green-110/40 opacity-50 cursor-not-allowed'
                    : 'border-white-10 hover:border-accent-green-110 cursor-pointer'
                )}
              >
                <img src={asset.thumbnailUrl ?? asset.url!} alt="" className="w-full h-full object-cover" />
                {alreadyAdded && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <ImageIcon className="w-3 h-3 text-accent-green-110" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
