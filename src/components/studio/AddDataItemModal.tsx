'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ImageIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useClient,
  useCreateDataItem,
  useUpdateDataItem,
  useBusinessDataLabels,
  type WorkspaceDataItem,
  type DataItemType,
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

  const [type, setType] = useState<DataItemType>(editItem?.type ?? (isRE ? 'CUSTOM' : 'TESTIMONIAL'));
  const [title, setTitle] = useState(editItem?.title ?? '');
  const [summary, setSummary] = useState(editItem?.summary ?? '');
  const [dataJson, setDataJson] = useState<Record<string, string>>(
    (editItem?.dataJson as Record<string, string>) ?? {}
  );
  const [imageUrl, setImageUrl] = useState(
    (editItem?.dataJson as Record<string, unknown>)?.imageUrl as string ?? ''
  );
  const [imageError, setImageError] = useState(false);
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

  const fields = TYPE_FIELDS[type] ?? [];
  const isPending = create.isPending || update.isPending;
  const error = create.error || update.error;

  const handleSave = () => {
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const finalDataJson = { ...dataJson };
    if (imageUrl.trim()) {
      finalDataJson.imageUrl = imageUrl.trim();
    } else {
      delete finalDataJson.imageUrl;
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

          {/* Image */}
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
              Image URL
            </label>
            {imageUrl && !imageError ? (
              <div className="flex items-start gap-3 mb-2">
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-white-5 border border-white-10">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setImageUrl(''); setImageError(false); }}
                  className="p-1.5 rounded-lg text-white-40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : imageUrl && imageError ? (
              <div className="flex items-center gap-2 mb-2 text-xs text-red-400">
                <ImageIcon className="w-4 h-4" />
                Image failed to load
                <button
                  type="button"
                  onClick={() => { setImageUrl(''); setImageError(false); }}
                  className="ml-auto text-white-40 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
            <input
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setImageError(false); }}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
            />
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
