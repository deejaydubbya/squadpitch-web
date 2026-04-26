'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronUp, Loader2, Pencil, X, Image as ImageIcon, AlertTriangle, FileText, Link, ClipboardEdit } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────

interface DataItem {
  id: string;
  type: string;
  title: string;
  dataJson: Record<string, unknown>;
}

interface Props {
  clientId: string;
  onConfirm: (
    selectedIds: string[],
    updates: Map<string, { title?: string; dataJson?: Record<string, unknown> }>,
  ) => void;
  onChooseMethod?: (method: string) => void;
}

interface PropertyEdits {
  title?: string;
  price?: string;
  bedrooms?: string;
  bathrooms?: string;
  sqft?: string;
  description?: string;
  images?: string[];
  imageUrl?: string;
}

// ── Main Component ───────────────────────────────────────────────────────

export function PropertyReviewCard({ clientId, onConfirm, onChooseMethod }: Props) {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Map<string, PropertyEdits>>(new Map());

  // Fetch saved data items on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/proxy/workspaces/${clientId}/business-data?limit=50`);
        if (res.ok) {
          const data = await res.json();
          const allItems: DataItem[] = data.dataItems ?? [];
          // Filter to only actual property/listing items — exclude agent names, contacts, etc.
          const PROPERTY_TYPES = new Set(['PROPERTY', 'property', 'listing', 'LISTING']);
          const fetched = allItems.filter((d) => {
            // Accept items with a property type
            if (PROPERTY_TYPES.has(d.type)) return true;
            // Accept items that look like properties (have address or price)
            const dj = d.dataJson;
            if (dj.address || dj.price || dj.listPrice || dj.beds || dj.bedrooms) return true;
            return false;
          });
          if (!cancelled) {
            setItems(fetched);
            setSelectedIds(new Set(fetched.map((d) => d.id)));
          }
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const singleItem = items.length === 1;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const getEdits = useCallback((id: string): PropertyEdits => {
    return edits.get(id) ?? {};
  }, [edits]);

  const updateEdit = useCallback((id: string, field: keyof PropertyEdits, value: string | string[]) => {
    setEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(id) ?? {};
      next.set(id, { ...current, [field]: value });
      return next;
    });
  }, []);

  const removeImage = useCallback((itemId: string, imageUrl: string) => {
    const item = items.find((d) => d.id === itemId);
    if (!item) return;

    const currentEdits = edits.get(itemId) ?? {};
    const currentImages = currentEdits.images ?? (item.dataJson.images as string[] | undefined) ?? [];
    const currentHero = currentEdits.imageUrl ?? (item.dataJson.imageUrl as string | undefined) ?? '';

    if (imageUrl === currentHero) {
      // Removing hero — promote first gallery image
      const remaining = currentImages.filter((u) => u !== imageUrl);
      const newHero = remaining[0] ?? '';
      const newGallery = remaining.slice(1);
      updateEdit(itemId, 'imageUrl', newHero);
      updateEdit(itemId, 'images', newGallery);
    } else {
      const newImages = currentImages.filter((u) => u !== imageUrl);
      updateEdit(itemId, 'images', newImages);
    }
  }, [items, edits, updateEdit]);

  const handleConfirm = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setConfirming(true);

    // Build updates map — only include items that were actually edited
    const updates = new Map<string, { title?: string; dataJson?: Record<string, unknown> }>();
    edits.forEach((itemEdits, id) => {
      const item = items.find((d) => d.id === id);
      if (!item) return;

      const patch: { title?: string; dataJson?: Record<string, unknown> } = {};
      if (itemEdits.title !== undefined && itemEdits.title !== item.title) {
        patch.title = itemEdits.title;
      }

      // Build dataJson patch from editable fields
      // Write both field name variants (beds/bedrooms, baths/bathrooms) so
      // both the API content-generation path and the UI read the updated values.
      const djPatch: Record<string, unknown> = {};
      if (itemEdits.price !== undefined) djPatch.price = itemEdits.price;
      if (itemEdits.bedrooms !== undefined) { djPatch.bedrooms = itemEdits.bedrooms; djPatch.beds = itemEdits.bedrooms; }
      if (itemEdits.bathrooms !== undefined) { djPatch.bathrooms = itemEdits.bathrooms; djPatch.baths = itemEdits.bathrooms; }
      if (itemEdits.sqft !== undefined) djPatch.sqft = itemEdits.sqft;
      if (itemEdits.description !== undefined) djPatch.description = itemEdits.description;
      if (itemEdits.images !== undefined) djPatch.images = itemEdits.images;
      if (itemEdits.imageUrl !== undefined) djPatch.imageUrl = itemEdits.imageUrl;

      if (Object.keys(djPatch).length > 0) {
        patch.dataJson = { ...item.dataJson, ...djPatch };
      }

      if (patch.title || patch.dataJson) {
        updates.set(id, patch);
      }
    });

    await onConfirm(ids, updates);
    setConfirmed(true);
    setConfirming(false);
  }, [selectedIds, edits, items, onConfirm]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-white-40 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading properties…
      </div>
    );
  }

  if (items.length === 0) return <EmptyExtractionCard onChooseMethod={onChooseMethod} />;

  const selectedCount = selectedIds.size;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white-90">
            {singleItem
              ? 'Review your listing'
              : `We found ${items.length} properties`}
          </h3>
          {!singleItem && (
            <span className="text-xs text-white-40">
              {selectedCount}/{items.length} selected
            </span>
          )}
        </div>
        <p className="text-xs text-white-40">
          {singleItem
            ? 'Check the details below and edit anything that looks off.'
            : 'Select the ones you want to create content for.'}
        </p>
      </div>

      {/* Property list */}
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const isExpanded = expandedId === item.id;
          const itemEdits = getEdits(item.id);
          return (
            <PropertyCard
              key={item.id}
              item={item}
              edits={itemEdits}
              isSelected={isSelected}
              isExpanded={isExpanded}
              showCheckbox={!singleItem}
              confirmed={confirmed}
              onToggleSelect={() => toggleSelect(item.id)}
              onToggleExpand={() => toggleExpand(item.id)}
              onEditField={(field, value) => updateEdit(item.id, field, value)}
              onRemoveImage={(url) => removeImage(item.id, url)}
            />
          );
        })}
      </div>

      {/* Confirm button */}
      {!confirmed && (
        <button
          onClick={handleConfirm}
          disabled={selectedCount === 0 || confirming}
          className={cn(
            'self-end flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer transition-all',
            (selectedCount === 0 || confirming) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {confirming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Confirm & Generate{!singleItem ? ` (${selectedCount})` : ''}
        </button>
      )}
    </div>
  );
}

// ── Property Card ────────────────────────────────────────────────────────

function PropertyCard({
  item,
  edits,
  isSelected,
  isExpanded,
  showCheckbox,
  confirmed,
  onToggleSelect,
  onToggleExpand,
  onEditField,
  onRemoveImage,
}: {
  item: DataItem;
  edits: PropertyEdits;
  isSelected: boolean;
  isExpanded: boolean;
  showCheckbox: boolean;
  confirmed: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onEditField: (field: keyof PropertyEdits, value: string) => void;
  onRemoveImage: (url: string) => void;
}) {
  const dj = item.dataJson;
  const str = (v: unknown) => (v == null ? '' : String(v));
  const title = edits.title ?? item.title ?? (str(dj.address) || 'Untitled');
  const price = edits.price ?? (str(dj.price) || str(dj.listPrice));
  const beds = edits.bedrooms ?? (str(dj.bedrooms) || str(dj.beds));
  const baths = edits.bathrooms ?? (str(dj.bathrooms) || str(dj.baths));
  const sqft = edits.sqft ?? (str(dj.sqft) || str(dj.squareFeet));
  const description = edits.description ?? str(dj.description);

  const propertyType = str(dj.propertyType) || str(dj.property_type) || str(dj.type) || '';
  const features = str(dj.features) || str(dj.keyFeatures) || '';

  const heroUrl = edits.imageUrl ?? (dj.imageUrl as string) ?? '';
  const galleryImages = edits.images ?? (dj.images as string[]) ?? [];
  const allImages = heroUrl ? [heroUrl, ...galleryImages.filter((u) => u !== heroUrl)] : galleryImages;

  // Build summary chips
  const chips: string[] = [];
  if (propertyType) chips.push(propertyType);
  if (price) chips.push(formatPrice(price));
  if (beds) chips.push(`${beds} bd`);
  if (baths) chips.push(`${baths} ba`);
  if (sqft) chips.push(`${formatNumber(sqft)} sqft`);

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isSelected ? 'border-white-10 bg-white-5' : 'border-white-10/50 bg-white-5/50 opacity-50',
      )}
    >
      {/* Collapsed header */}
      <div className="flex items-center gap-2 p-3">
        {showCheckbox && !confirmed && (
          <button
            onClick={onToggleSelect}
            className={cn(
              'flex-none w-5 h-5 rounded border flex items-center justify-center transition-colors',
              isSelected
                ? 'bg-accent-green-110 border-accent-green-110'
                : 'border-white-20 hover:border-white-40',
            )}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        )}

        {heroUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={heroUrl}
            alt=""
            className="flex-none w-10 h-10 rounded object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        {!heroUrl && allImages.length === 0 && (
          <div className="flex-none w-10 h-10 rounded bg-white-10 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-white-30" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white-90 truncate">{title}</p>
          {chips.length > 0 && (
            <p className="text-xs text-white-40 truncate">{chips.join(' · ')}</p>
          )}
        </div>

        {!confirmed && (
          <button
            onClick={onToggleExpand}
            className="flex-none text-white-30 hover:text-white-60 transition-colors p-1"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && !confirmed && (
        <div className="px-3 pb-3 flex flex-col gap-2 border-t border-white-10 pt-2">
          {/* Editable fields */}
          <EditableDetailRow label="Title / Address" value={title} onChange={(v) => onEditField('title', v)} />
          <EditableDetailRow label="Price" value={price} onChange={(v) => onEditField('price', v)} />
          <div className="grid grid-cols-3 gap-2">
            <EditableDetailRow label="Beds" value={beds} onChange={(v) => onEditField('bedrooms', v)} />
            <EditableDetailRow label="Baths" value={baths} onChange={(v) => onEditField('bathrooms', v)} />
            <EditableDetailRow label="Sqft" value={sqft} onChange={(v) => onEditField('sqft', v)} />
          </div>
          {description && (
            <EditableDetailRow label="Description" value={description} onChange={(v) => onEditField('description', v)} multiline />
          )}
          {features && (
            <div className="p-2.5 rounded-lg border border-white-10">
              <p className="text-[11px] text-white-40 mb-0.5">Key features</p>
              <p className="text-white-70 text-xs line-clamp-3">{features}</p>
            </div>
          )}

          {/* Image gallery */}
          {allImages.length > 0 && (
            <div>
              <p className="text-[11px] text-white-40 mb-1">Images ({allImages.length})</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-dark">
                {allImages.map((url, i) => (
                  <div key={url} className="relative flex-none group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Property image ${i + 1}`}
                      className="w-16 h-16 rounded object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                    <button
                      onClick={() => onRemoveImage(url)}
                      className={cn(
                        'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full',
                        'bg-red-500 text-white flex items-center justify-center',
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                      )}
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {i === 0 && heroUrl && (
                      <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/60 text-white px-1 rounded">
                        Hero
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {allImages.length === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-white-30 py-2">
              <ImageIcon className="w-3.5 h-3.5" />
              No images
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Editable Detail Row (matches BrandPreviewCard pattern) ───────────────

function EditableDetailRow({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="p-2.5 rounded-lg border border-white-10">
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-[11px] text-white-40">{label}</p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-white-30 hover:text-white-60 transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            autoFocus
            rows={3}
            className={cn(
              'w-full px-2 py-1 rounded text-xs',
              'bg-white-5 border border-accent-green-110/50 text-white-90',
              'focus:outline-none resize-none',
            )}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditing(false); }}
            autoFocus
            className={cn(
              'w-full px-2 py-1 rounded text-xs',
              'bg-white-5 border border-accent-green-110/50 text-white-90 focus:outline-none',
            )}
          />
        )
      ) : (
        <p className="text-white-70 line-clamp-3 text-xs">{value || '—'}</p>
      )}
    </div>
  );
}

// ── Empty extraction fallback ─────────────────────────────────────────

function EmptyExtractionCard({ onChooseMethod }: { onChooseMethod?: (method: string) => void }) {
  const options = [
    { method: 'description', label: 'Paste listing details', icon: FileText },
    { method: 'manual_form', label: 'Enter manually', icon: ClipboardEdit },
    { method: 'single_listing_url', label: 'Try another link', icon: Link },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-none mt-0.5" />
        <div>
          <p className="text-sm font-medium text-white-90">
            I couldn&apos;t confidently extract listing details from this page.
          </p>
          <p className="text-xs text-white-40 mt-1">
            Some sites block automated access. You can try one of these options instead.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {options.map(({ method, label, icon: Icon }) => (
          <button
            key={method}
            onClick={() => onChooseMethod?.(method)}
            className={cn(
              'flex items-center gap-2.5 p-3 rounded-lg text-left',
              'bg-white-5 hover:bg-white-10 border border-transparent hover:border-accent-green-110/30',
              'transition-all cursor-pointer',
            )}
          >
            <Icon className="w-4 h-4 text-accent-green-110 flex-none" />
            <span className="text-sm text-white-90">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatPrice(raw: string): string {
  const s = String(raw);
  const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return s;
  return '$' + num.toLocaleString();
}

function formatNumber(raw: string): string {
  const s = String(raw);
  const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return s;
  return num.toLocaleString();
}
