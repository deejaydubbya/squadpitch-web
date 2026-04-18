'use client';

import { useState } from 'react';
import {
  X,
  Loader2,
  Search,
  Home,
  Check,
  Building2,
} from 'lucide-react';
import {
  usePropertyListingsSearch,
  useManualListingImport,
  type UnifiedListing,
  type PropertyListingsSearchParams,
  type ManualListingInput,
} from '@/hooks/useSquadpitch';

/* ── Constants ──────────────────────────────────────────────────────────── */

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

/* ── ResultCard ─────────────────────────────────────────────────────────── */

function ResultCard({
  listing,
  onSelect,
  onImport,
  importingId,
  importedId,
}: {
  listing: UnifiedListing;
  onSelect: () => void;
  onImport: () => void;
  importingId: string | null;
  importedId: string | null;
}) {
  const id = listing.providerId ?? '';
  const isImporting = importingId === id;
  const isImported = importedId === id;
  const statusKey = listing.status?.toLowerCase().replace(/\s+/g, '_') ?? '';
  const statusColor = STATUS_COLORS[statusKey] ?? STATUS_COLORS.off_market;
  const statusLabel = listing.status
    ? listing.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  const typeLabel = PROPERTY_TYPE_OPTIONS.find(
    (o) => o.value === listing.propertyType
  )?.label ?? listing.propertyType?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? null;

  const details = [
    typeLabel,
    listing.bedrooms != null ? `${listing.bedrooms} bd` : null,
    listing.bathrooms != null ? `${listing.bathrooms} ba` : null,
    listing.sqft != null ? `${listing.sqft.toLocaleString()} sq ft` : null,
  ]
    .filter(Boolean)
    .join('  \u00b7  ');

  const priceLine = [
    listing.price != null ? fmtCurrency(listing.price) : null,
    listing.daysOnMarket != null ? `${listing.daysOnMarket} days on market` : null,
  ]
    .filter(Boolean)
    .join('  \u00b7  ');

  return (
    <div className="rounded-xl border border-white-10 bg-white-5 p-3 space-y-1.5">
      {/* Top row: address + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Home className="w-4 h-4 text-white-40 mt-0.5 flex-shrink-0" />
          <span className="text-sm font-medium text-white-100 leading-snug">
            {listing.formattedAddress ?? [listing.street, listing.city, listing.state, listing.zip].filter(Boolean).join(', ')}
          </span>
        </div>
        {statusLabel && (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor}`}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* Details line */}
      {details && (
        <p className="text-xs text-white-40 pl-6">{details}</p>
      )}

      {/* Price line */}
      {priceLine && (
        <p className="text-xs text-white-60 pl-6 font-medium">{priceLine}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onImport}
          disabled={isImporting || isImported}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white-10 text-white-60 hover:text-white-100 hover:border-white-20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving…
            </>
          ) : isImported ? (
            <>
              <Check className="w-3 h-3 text-green-400" />
              Saved
            </>
          ) : (
            'Save to Library'
          )}
        </button>
        <button
          onClick={onSelect}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-green-110 text-sp-surface hover:bg-accent-green-120 transition-colors flex items-center gap-1"
        >
          Select
          <span className="text-[10px]">&rarr;</span>
        </button>
      </div>
    </div>
  );
}

/* ── PropertySearchModal ────────────────────────────────────────────────── */

interface Props {
  clientId: string;
  onSelect: (listing: UnifiedListing) => void;
  onClose: () => void;
}

export function PropertySearchModal({ clientId, onSelect, onClose }: Props) {
  /* ── search form state ─────────────────────────────────────────────── */
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [propertyType, setPropertyType] = useState('');

  /* ── import tracking ───────────────────────────────────────────────── */
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedId, setImportedId] = useState<string | null>(null);

  /* ── hooks ─────────────────────────────────────────────────────────── */
  const search = usePropertyListingsSearch(clientId);
  const manualImport = useManualListingImport(clientId);

  const canSearch =
    address.trim() || city.trim() || state.trim() || zip.trim();

  const handleSearch = () => {
    if (!canSearch) return;
    const params: PropertyListingsSearchParams = {};
    if (address.trim()) params.address = address.trim();
    if (city.trim()) params.city = city.trim();
    if (state.trim()) params.state = state.trim();
    if (zip.trim()) params.zipCode = zip.trim();
    if (propertyType) params.propertyType = propertyType;
    search.mutate(params);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleImport = (listing: UnifiedListing) => {
    const id = listing.providerId ?? '';
    setImportingId(id);
    const body: ManualListingInput = {
      status: listing.status ?? 'active',
      address: listing.formattedAddress ?? undefined,
      street: listing.street ?? undefined,
      city: listing.city ?? undefined,
      state: listing.state ?? undefined,
      zip: listing.zip ?? undefined,
      price: listing.price ?? undefined,
      beds: listing.bedrooms ?? undefined,
      baths: listing.bathrooms ?? undefined,
      sqft: listing.sqft ?? undefined,
      lotSize: listing.lotSize != null ? String(listing.lotSize) : undefined,
      yearBuilt: listing.yearBuilt ?? undefined,
      propertyType: listing.propertyType ?? undefined,
      agentName: listing.agent ?? undefined,
      brokerage: listing.office ?? undefined,
    };
    manualImport.mutate(body, {
      onSuccess: () => {
        setImportingId(null);
        setImportedId(id);
        setTimeout(() => setImportedId((prev) => (prev === id ? null : prev)), 2500);
      },
      onError: () => {
        setImportingId(null);
      },
    });
  };

  const handleSelect = (listing: UnifiedListing) => {
    onSelect(listing);
    onClose();
  };

  const results = search.data?.data ?? null;

  /* ── render ────────────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col bg-sp-bg border border-white-10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white-10">
          <div>
            <h2 className="text-base font-semibold text-white-100">
              Find Property
            </h2>
            <p className="text-xs text-white-40 mt-0.5">
              Search listings by address, city, or ZIP code
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white-40 hover:text-white-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Search Form ─────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white-10 space-y-3 flex-shrink-0">
          {/* Street address */}
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
              Street Address
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="123 Main St"
              className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
            />
          </div>

          {/* City / State / ZIP */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
                City
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Austin"
                className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
                State
              </label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="TX"
                className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
                ZIP
              </label>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="78701"
                className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
          </div>

          {/* Property type + Search button */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 appearance-none"
              >
                <option value="">Any</option>
                {PROPERTY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSearch}
              disabled={!canSearch || search.isPending}
              className="px-5 py-2.5 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {search.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
          </div>
        </div>

        {/* ── Results ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {/* Idle state */}
          {!search.data && !search.isPending && !search.isError && (
            <div className="flex flex-col items-center justify-center py-12 text-white-30">
              <Building2 className="w-10 h-10 mb-3" />
              <p className="text-sm">
                Enter an address, city, or ZIP to find properties
              </p>
            </div>
          )}

          {/* Loading */}
          {search.isPending && (
            <div className="flex flex-col items-center justify-center py-12 text-white-40">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Searching listings…</p>
            </div>
          )}

          {/* Error */}
          {search.isError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {(search.error as Error)?.message || 'Search failed. Please try again.'}
            </div>
          )}

          {/* Empty results */}
          {results && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-white-30">
              <Search className="w-10 h-10 mb-3" />
              <p className="text-sm">No listings found</p>
            </div>
          )}

          {/* Result cards */}
          {results &&
            results.length > 0 &&
            results.map((listing, i) => (
              <ResultCard
                key={listing.providerId ?? i}
                listing={listing}
                onSelect={() => handleSelect(listing)}
                onImport={() => handleImport(listing)}
                importingId={importingId}
                importedId={importedId}
              />
            ))}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        {results && results.length > 0 && (
          <div className="px-6 py-3 border-t border-white-10 text-xs text-white-40">
            {results.length} listing{results.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
    </div>
  );
}
