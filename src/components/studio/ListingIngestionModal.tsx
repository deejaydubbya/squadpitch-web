'use client';

import { useState, useRef, useMemo } from 'react';
import {
  X,
  Loader2,
  Plus,
  FileSpreadsheet,
  Globe,
  Upload,
  Check,
  AlertCircle,
  ChevronDown,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useManualListingImport,
  useListingCSVPreview,
  useListingCSVImport,
  useListingUrlImport,
  useListingUrlConfirm,
  type ManualListingInput,
  type CanonicalListing,
  type ListingCSVPreviewResult,
} from '@/hooks/useSquadpitch';

const TABS = [
  { key: 'manual', label: 'Manual', icon: Plus },
  { key: 'csv', label: 'CSV Import', icon: FileSpreadsheet },
  { key: 'url', label: 'URL Import', icon: Globe },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'sold', label: 'Sold' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'off_market', label: 'Off Market' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi_family', label: 'Multi Family' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'mobile_home', label: 'Mobile Home' },
  { value: 'farm', label: 'Farm / Ranch' },
  { value: 'other', label: 'Other' },
];

// Listing-specific CSV column mapping fields
const CSV_LISTING_FIELDS = [
  { key: 'title', label: 'Title / Address' },
  { key: 'price', label: 'Price' },
  { key: 'street', label: 'Street Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP Code' },
  { key: 'beds', label: 'Bedrooms' },
  { key: 'baths', label: 'Bathrooms' },
  { key: 'sqft', label: 'Sq Ft' },
  { key: 'propertyType', label: 'Property Type' },
  { key: 'status', label: 'Status' },
  { key: 'imageUrl', label: 'Image URL' },
  { key: 'listingUrl', label: 'Listing URL' },
  { key: 'description', label: 'Description' },
  { key: 'agentName', label: 'Agent Name' },
  { key: 'brokerage', label: 'Brokerage' },
  { key: 'yearBuilt', label: 'Year Built' },
  { key: 'lotSize', label: 'Lot Size' },
  { key: 'sourceId', label: 'MLS / Listing ID' },
];

interface Props {
  clientId: string;
  onClose: () => void;
}

export function ListingIngestionModal({ clientId, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('manual');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-sp-bg border border-white-10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white-10">
          <div>
            <h2 className="text-lg font-bold text-white-100">Add Property</h2>
            <p className="text-xs text-white-40 mt-0.5">
              Add a property manually, from CSV, or paste a link
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white-40 hover:text-white-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-2 border-b border-white-10">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setError(null);
                  setSuccess(null);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  tab === t.key
                    ? 'bg-accent-green-110 text-sp-surface'
                    : 'bg-white-5 text-white-60 hover:bg-white-10'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs mb-4">
              <Check className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {tab === 'manual' && (
            <ManualTab
              clientId={clientId}
              onError={setError}
              onSuccess={(msg) => {
                setSuccess(msg);
                setTimeout(onClose, 1200);
              }}
            />
          )}
          {tab === 'csv' && (
            <CSVTab
              clientId={clientId}
              onError={setError}
              onSuccess={(msg) => {
                setSuccess(msg);
                setTimeout(onClose, 1500);
              }}
            />
          )}
          {tab === 'url' && (
            <URLTab
              clientId={clientId}
              onError={setError}
              onSuccess={(msg) => {
                setSuccess(msg);
                setTimeout(onClose, 1200);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Manual Tab ──────────────────────────────────────────────────────────────

function ManualTab({
  clientId,
  onError,
  onSuccess,
}: {
  clientId: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const manualImport = useManualListingImport(clientId);

  const [form, setForm] = useState<ManualListingInput>({
    status: 'active',
  });

  const set = (key: keyof ManualListingInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!form.title && !form.street && !form.address) {
      onError('A title or address is required');
      return;
    }
    manualImport.mutate(form, {
      onSuccess: (data) => {
        onSuccess(
          data.created
            ? 'Listing added successfully'
            : 'Existing listing updated'
        );
      },
      onError: (err) => onError(err.message || 'Failed to save listing'),
    });
  };

  const canSave =
    (form.title || form.street || form.address) && !manualImport.isPending;

  return (
    <div className="space-y-4">
      {/* Address section */}
      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
          Address
        </label>
        <div className="space-y-2">
          <input
            value={form.street || ''}
            onChange={(e) => set('street', e.target.value)}
            placeholder="Street address"
            className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              value={form.city || ''}
              onChange={(e) => set('city', e.target.value)}
              placeholder="City"
              className="px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
            />
            <input
              value={form.state || ''}
              onChange={(e) => set('state', e.target.value)}
              placeholder="State"
              className="px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
            />
            <input
              value={form.zip || ''}
              onChange={(e) => set('zip', e.target.value)}
              placeholder="ZIP"
              className="px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
            />
          </div>
        </div>
      </div>

      {/* Title (auto-fills from address if blank) */}
      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
          Title (optional — auto-generated from address)
        </label>
        <input
          value={form.title || ''}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Stunning 4BR in Downtown Austin"
          maxLength={200}
          className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
        />
      </div>

      {/* Price + Status + Type */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Price
          </label>
          <input
            value={form.price || ''}
            onChange={(e) => set('price', e.target.value)}
            placeholder="$495,000"
            className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Status
          </label>
          <select
            value={form.status || 'active'}
            onChange={(e) => set('status', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Property Type
          </label>
          <select
            value={form.propertyType || ''}
            onChange={(e) => set('propertyType', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          >
            <option value="">Select...</option>
            {PROPERTY_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Beds / Baths / Sqft */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Beds
          </label>
          <input
            type="number"
            value={form.beds || ''}
            onChange={(e) => set('beds', e.target.value)}
            placeholder="4"
            min={0}
            className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Baths
          </label>
          <input
            type="number"
            step="0.5"
            value={form.baths || ''}
            onChange={(e) => set('baths', e.target.value)}
            placeholder="2.5"
            min={0}
            className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Sq Ft
          </label>
          <input
            type="number"
            value={form.sqft || ''}
            onChange={(e) => set('sqft', e.target.value)}
            placeholder="2,500"
            min={0}
            className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
          Description
        </label>
        <textarea
          value={form.description || ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Property highlights, features, upgrades..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none placeholder:text-white-30"
        />
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
          Image URL
        </label>
        <input
          value={form.imageUrl || ''}
          onChange={(e) => set('imageUrl', e.target.value)}
          placeholder="https://example.com/photo.jpg"
          className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
        />
      </div>

      {/* Listing URL */}
      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
          Listing URL
        </label>
        <input
          value={form.listingUrl || ''}
          onChange={(e) => set('listingUrl', e.target.value)}
          placeholder="https://yoursite.com/listing/123"
          className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
        />
      </div>

      {/* Agent / Brokerage */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Agent Name
          </label>
          <input
            value={form.agentName || ''}
            onChange={(e) => set('agentName', e.target.value)}
            placeholder="Jane Smith"
            className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Brokerage
          </label>
          <input
            value={form.brokerage || ''}
            onChange={(e) => set('brokerage', e.target.value)}
            placeholder="Acme Realty"
            className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {manualImport.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Home className="w-4 h-4" />
            Add Listing
          </>
        )}
      </button>
    </div>
  );
}

// ── CSV Tab ─────────────────────────────────────────────────────────────────

function CSVTab({
  clientId,
  onError,
  onSuccess,
}: {
  clientId: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const csvPreview = useListingCSVPreview(clientId);
  const csvImport = useListingCSVImport(clientId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvContent, setCsvContent] = useState('');
  const [step, setStep] = useState<'upload' | 'map' | 'result'>('upload');
  const [previewData, setPreviewData] = useState<ListingCSVPreviewResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onError('File must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setCsvContent(content);
      csvPreview.mutate(
        { csvContent: content },
        {
          onSuccess: (data) => {
            setPreviewData(data);
            setMapping(data.autoMapping || {});
            setStep('map');
          },
          onError: (err) => onError(err.message || 'Failed to parse CSV'),
        }
      );
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    csvImport.mutate(
      { csvContent, columnMapping: mapping },
      {
        onSuccess: (data) => {
          onSuccess(
            `${data.imported} imported, ${data.updated} updated, ${data.skipped} skipped`
          );
        },
        onError: (err) => onError(err.message || 'Failed to import listings'),
      }
    );
  };

  const autoMappedCount = Object.keys(mapping).filter((k) => mapping[k]).length;

  return (
    <div className="space-y-4">
      {step === 'upload' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={csvPreview.isPending}
            className="flex flex-col items-center gap-3 w-full py-12 rounded-xl border-2 border-dashed border-white-10 text-white-40 hover:border-white-20 hover:text-white-60 transition-colors"
          >
            {csvPreview.isPending ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">Parsing CSV...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-sm">
                  Click to upload a CSV file (max 5MB)
                </span>
                <span className="text-xs text-white-30">
                  Columns like price, beds, baths, address will be auto-detected
                </span>
              </>
            )}
          </button>
        </>
      )}

      {step === 'map' && previewData && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white-100">
                {previewData.rowCount} rows found
              </p>
              <p className="text-xs text-white-40">
                {autoMappedCount > 0
                  ? `${autoMappedCount} columns auto-detected.`
                  : 'Map CSV columns to listing fields.'}{' '}
                Adjust if needed.
              </p>
            </div>
            <button
              onClick={() => {
                setStep('upload');
                setCsvContent('');
                setPreviewData(null);
                setMapping({});
              }}
              className="text-xs text-white-40 hover:text-white-60"
            >
              Change file
            </button>
          </div>

          {/* Sample data preview */}
          {previewData.sampleRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-white-10">
              <table className="text-xs w-full">
                <thead>
                  <tr className="bg-white-5">
                    {previewData.headers.slice(0, 6).map((h) => (
                      <th
                        key={h}
                        className="px-2 py-1.5 text-left text-white-40 font-medium"
                      >
                        {h}
                      </th>
                    ))}
                    {previewData.headers.length > 6 && (
                      <th className="px-2 py-1.5 text-white-30">
                        +{previewData.headers.length - 6}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewData.sampleRows.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-t border-white-5">
                      {previewData.headers.slice(0, 6).map((h) => (
                        <td
                          key={h}
                          className="px-2 py-1.5 text-white-60 truncate max-w-[120px]"
                        >
                          {row[h] || '—'}
                        </td>
                      ))}
                      {previewData.headers.length > 6 && (
                        <td className="px-2 py-1.5 text-white-30">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Column mapping */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white-40 uppercase tracking-wider">
              Column Mapping
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CSV_LISTING_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <span className="w-28 text-xs text-white-60 truncate flex-shrink-0">
                    {field.label}
                  </span>
                  <select
                    value={mapping[field.key] || ''}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: e.target.value || '',
                      }))
                    }
                    className="flex-1 px-2 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 min-w-0"
                  >
                    <option value="">— skip —</option>
                    {previewData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={csvImport.isPending || !mapping.title}
            className="w-full py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {csvImport.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                Import {previewData.rowCount} Listings
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

// ── URL Tab ─────────────────────────────────────────────────────────────────

function URLTab({
  clientId,
  onError,
  onSuccess,
}: {
  clientId: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const urlImport = useListingUrlImport(clientId);
  const urlConfirm = useListingUrlConfirm(clientId);

  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<CanonicalListing | null>(null);
  const [editedPreview, setEditedPreview] = useState<Record<string, unknown>>({});

  const handleFetch = () => {
    urlImport.mutate(
      { url },
      {
        onSuccess: (data) => {
          setPreview(data.normalized);
          setEditedPreview(data.normalized as unknown as Record<string, unknown>);
        },
        onError: (err) => onError(err.message || 'Failed to fetch listing'),
      }
    );
  };

  const handleConfirm = () => {
    urlConfirm.mutate(editedPreview, {
      onSuccess: (data) => {
        onSuccess(
          data.created ? 'Listing imported successfully' : 'Existing listing updated'
        );
      },
      onError: (err) => onError(err.message || 'Failed to save listing'),
    });
  };

  const setField = (key: string, value: unknown) => {
    setEditedPreview((prev) => ({ ...prev, [key]: value }));
  };

  const setAddressField = (key: string, value: string) => {
    setEditedPreview((prev) => ({
      ...prev,
      address: {
        ...(prev.address as Record<string, string> || {}),
        [key]: value,
      },
    }));
  };

  if (!preview) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Listing URL
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.zillow.com/homedetails/..."
            className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          <p className="text-[10px] text-white-30 mt-1.5">
            Paste a listing URL from any real estate site. We&apos;ll extract
            what we can — you can edit before saving.
          </p>
        </div>
        <button
          onClick={handleFetch}
          disabled={!url || urlImport.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {urlImport.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <Globe className="w-4 h-4" />
              Fetch Listing
            </>
          )}
        </button>
      </div>
    );
  }

  // Preview / Edit mode
  const addr = (editedPreview.address as Record<string, string>) || {};
  const imgs = (editedPreview.images as string[]) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white-100">Review extracted data</p>
        <button
          onClick={() => {
            setPreview(null);
            setEditedPreview({});
          }}
          className="flex items-center gap-1 text-xs text-white-40 hover:text-white-60"
        >
          <ArrowLeft className="w-3 h-3" />
          Try different URL
        </button>
      </div>

      {/* Extracted image */}
      {imgs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-1">
          {imgs.slice(0, 4).map((img, i) => (
            <div
              key={i}
              className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-white-5 border border-white-10"
            >
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Editable fields */}
      <div className="space-y-3">
        <input
          value={(editedPreview.title as string) || ''}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="Title"
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
        />

        <div className="grid grid-cols-3 gap-2">
          <input
            value={(editedPreview.price as string) || ''}
            onChange={(e) => setField('price', e.target.value)}
            placeholder="Price"
            className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          <input
            value={(editedPreview.beds as string) || ''}
            onChange={(e) => setField('beds', e.target.value)}
            placeholder="Beds"
            className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          <input
            value={(editedPreview.baths as string) || ''}
            onChange={(e) => setField('baths', e.target.value)}
            placeholder="Baths"
            className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            value={(editedPreview.sqft as string) || ''}
            onChange={(e) => setField('sqft', e.target.value)}
            placeholder="Sq Ft"
            className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          <input
            value={(editedPreview.yearBuilt as string) || ''}
            onChange={(e) => setField('yearBuilt', e.target.value)}
            placeholder="Year Built"
            className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>

        <input
          value={addr.street || ''}
          onChange={(e) => setAddressField('street', e.target.value)}
          placeholder="Street address"
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            value={addr.city || ''}
            onChange={(e) => setAddressField('city', e.target.value)}
            placeholder="City"
            className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          <input
            value={addr.state || ''}
            onChange={(e) => setAddressField('state', e.target.value)}
            placeholder="State"
            className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          <input
            value={addr.zip || ''}
            onChange={(e) => setAddressField('zip', e.target.value)}
            placeholder="ZIP"
            className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>

        <textarea
          value={(editedPreview.description as string) || ''}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none placeholder:text-white-30"
        />
      </div>

      <button
        onClick={handleConfirm}
        disabled={urlConfirm.isPending}
        className="w-full py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {urlConfirm.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Save Listing
          </>
        )}
      </button>
    </div>
  );
}
