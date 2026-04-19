'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, MapPin, Search, Loader2, ArrowRight, Bookmark, Check,
  Sparkles, Crown, Zap, ChevronDown, ChevronUp, BookmarkPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useListingOpportunities,
  useManualListingImport,
  useUpsertBrandProfile,
  useProperties,
  type UnifiedListing,
  type ManualListingInput,
} from '@/hooks/useSquadpitch';
import { rankListings } from './NearbyListingsWidget';

// ── Types ───────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  initialArea: { zipCode?: string; city?: string; state?: string };
}

type SortMode = 'relevance' | 'price_asc' | 'price_desc' | 'newest';
type PropertyTypeFilter = 'all' | 'Single Family' | 'Condo' | 'Townhouse' | 'Multi-Family';

// ── Helpers ─────────────────────────────────────────────────────────────

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

function getBadges(listing: UnifiedListing, savedAddresses: Set<string>) {
  const badges: Array<{ label: string; className: string; icon?: typeof Sparkles }> = [];
  if (listing.daysOnMarket != null && listing.daysOnMarket <= 7)
    badges.push({ label: 'New', className: 'bg-green-500/20 text-green-400', icon: Sparkles });
  if (listing.price != null && listing.price >= 750_000)
    badges.push({ label: 'Luxury', className: 'bg-purple-500/20 text-purple-300', icon: Crown });
  if (listing.price != null && listing.formattedAddress && listing.bedrooms != null && listing.bathrooms != null && listing.sqft != null)
    badges.push({ label: 'Campaign Ready', className: 'bg-blue-500/20 text-blue-400', icon: Zap });
  const addr = listing.formattedAddress?.toLowerCase();
  if (addr && savedAddresses.has(addr))
    badges.push({ label: 'Saved', className: 'bg-white/10 text-white-60' });
  return badges;
}

// ── Drawer Listing Card ─────────────────────────────────────────────────

function DrawerListingCard({
  listing,
  clientId,
  savedAddresses,
}: {
  listing: UnifiedListing;
  clientId: string;
  savedAddresses: Set<string>;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const manualImport = useManualListingImport(clientId);
  const address = listing.formattedAddress ?? listing.street ?? 'Unknown address';
  const statusLabel = listing.status?.replace(/_/g, ' ') ?? '';
  const statusClass = STATUS_COLORS[listing.status ?? ''] ?? 'bg-white/10 text-white-40';
  const badges = getBadges(listing, savedAddresses);

  const specs = [
    listing.bedrooms != null ? `${listing.bedrooms} bd` : null,
    listing.bathrooms != null ? `${listing.bathrooms} ba` : null,
    listing.sqft != null ? `${listing.sqft.toLocaleString()} sqft` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleCreate = () => {
    sessionStorage.setItem('sp_nearby_listing', JSON.stringify(listing));
    router.push(`/workspaces/${clientId}/listing-campaign?source=nearby`);
  };

  const handleSave = () => {
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
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      },
    });
  };

  return (
    <div className="rounded-lg border border-white-10 bg-white/[0.02] p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white-100 leading-tight">
            {address}
          </p>
          {listing.price != null && (
            <p className="text-lg font-semibold text-white-100 mt-1">
              {fmtCurrency(listing.price)}
            </p>
          )}
        </div>
        {statusLabel && (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              statusClass,
            )}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {specs && <p className="text-xs text-white-40">{specs}</p>}

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {badges.map((b) => (
            <span
              key={b.label}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                b.className,
              )}
            >
              {b.icon && <b.icon className="w-2.5 h-2.5" />}
              {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Expandable detail panel */}
      {expanded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white-40 pt-2 border-t border-white-10">
          {listing.propertyType && <div>Type: <span className="text-white-60">{listing.propertyType}</span></div>}
          {listing.yearBuilt != null && <div>Built: <span className="text-white-60">{listing.yearBuilt}</span></div>}
          {listing.lotSize != null && <div>Lot: <span className="text-white-60">{listing.lotSize.toLocaleString()} sqft</span></div>}
          {listing.daysOnMarket != null && <div>Days on market: <span className="text-white-60">{listing.daysOnMarket}</span></div>}
          {listing.agent && <div>Agent: <span className="text-white-60">{listing.agent}</span></div>}
          {listing.office && <div>Office: <span className="text-white-60">{listing.office}</span></div>}
        </div>
      )}

      <div className="flex items-center gap-3 mt-auto pt-1">
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          Create Campaign <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={handleSave}
          disabled={manualImport.isPending || saved}
          className="flex items-center gap-1 text-xs font-medium text-white-40 hover:text-white-100 transition-colors disabled:opacity-50"
          title="Save to library"
        >
          {saved ? (
            <><Check className="w-3 h-3 text-green-400" /> Saved</>
          ) : manualImport.isPending ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
          ) : (
            <><Bookmark className="w-3 h-3" /> Save</>
          )}
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto flex items-center gap-1 text-xs text-white-40 hover:text-white-100 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Less</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Details</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Drawer ───────────────────────────────────────────────────────────────

export function ListingOpportunitiesDrawer({ clientId, isOpen, onClose, initialArea }: Props) {
  const [zipCode, setZipCode] = useState(initialArea.zipCode ?? '');
  const [city, setCity] = useState(initialArea.city ?? '');
  const [state, setState] = useState(initialArea.state ?? '');
  const [inputValue, setInputValue] = useState(
    initialArea.city && initialArea.state
      ? `${initialArea.city}, ${initialArea.state}`
      : initialArea.zipCode ?? '',
  );
  const [showAreaEdit, setShowAreaEdit] = useState(false);

  // Filters
  const [propertyType, setPropertyType] = useState<PropertyTypeFilter>('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('relevance');

  const upsertBrand = useUpsertBrandProfile(clientId);
  const { data: properties } = useProperties(clientId);
  const bulkImport = useManualListingImport(clientId);

  const savedAddresses = useMemo(() => {
    const set = new Set<string>();
    if (properties) {
      for (const p of properties) {
        const addr =
          (p.dataJson as Record<string, unknown> | null)?.address as string | undefined;
        if (addr) set.add(addr.toLowerCase());
      }
    }
    return set;
  }, [properties]);

  const { data: listings, isLoading } = useListingOpportunities(clientId, {
    zipCode: zipCode || undefined,
    city: city || undefined,
    state: state || undefined,
  });

  // Rank then filter/sort client-side
  const filtered = useMemo(() => {
    let result = rankListings(listings ?? []);

    // Property type filter
    if (propertyType !== 'all') {
      result = result.filter(
        (l) => l.propertyType?.toLowerCase() === propertyType.toLowerCase(),
      );
    }

    // Price range
    const min = priceMin ? Number(priceMin) : 0;
    const max = priceMax ? Number(priceMax) : Infinity;
    if (min > 0 || max < Infinity) {
      result = result.filter((l) => {
        const p = l.price ?? 0;
        return p >= min && p <= max;
      });
    }

    // Sort
    if (sortMode === 'price_asc') {
      result = [...result].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sortMode === 'price_desc') {
      result = [...result].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (sortMode === 'newest') {
      result = [...result].sort(
        (a, b) => (a.daysOnMarket ?? 999) - (b.daysOnMarket ?? 999),
      );
    }
    // 'relevance' keeps existing rank order

    return result;
  }, [listings, propertyType, priceMin, priceMax, sortMode]);

  const areaLabel = city && state ? `${city}, ${state}` : zipCode || '';

  const handleAreaSearch = () => {
    const trimmed = inputValue.trim();
    if (/^\d{5}$/.test(trimmed)) {
      setZipCode(trimmed);
      setCity('');
      setState('');
      setShowAreaEdit(false);
      upsertBrand.mutate({ primaryZip: trimmed });
    } else {
      const match = trimmed.match(/^(.+?),\s*([A-Za-z]{2})$/);
      if (match) {
        setCity(match[1].trim());
        setState(match[2].toUpperCase());
        setZipCode('');
        setShowAreaEdit(false);
        upsertBrand.mutate({ city: match[1].trim(), state: match[2].toUpperCase() });
      }
    }
  };

  const handleSaveAllFiltered = () => {
    for (const listing of filtered) {
      if (savedAddresses.has(listing.formattedAddress?.toLowerCase() ?? '')) continue;
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
      bulkImport.mutate(body);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer panel */}
      <div className="relative w-full max-w-lg flex flex-col bg-sp-bg border-l border-white-10 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white-10">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-white-100">Listing Opportunities</h2>
            {filtered.length > 0 && (
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                {filtered.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white-40 hover:text-white-100 hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Area display + edit */}
        <div className="px-5 py-3 border-b border-white-10">
          {showAreaEdit ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAreaSearch()}
                placeholder="ZIP or City, ST"
                className="flex-1 rounded-md border border-white-10 bg-white/5 px-3 py-1.5 text-sm text-white-100 placeholder:text-white-20 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleAreaSearch}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-white-60">{areaLabel}</span>
              <button
                onClick={() => { setShowAreaEdit(true); setInputValue(areaLabel); }}
                className="text-xs text-white-40 hover:text-white-100 transition-colors"
              >
                Change area
              </button>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="px-5 py-3 border-b border-white-10 flex flex-wrap gap-2">
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as PropertyTypeFilter)}
            className="rounded-md border border-white-10 bg-sp-bg px-2 py-1 text-xs text-white-100 focus:outline-none focus:border-blue-500 [&>option]:bg-sp-bg [&>option]:text-white-100"
          >
            <option value="all">All Types</option>
            <option value="Single Family">Single Family</option>
            <option value="Condo">Condo</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Multi-Family">Multi-Family</option>
          </select>

          <input
            type="number"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="Min $"
            className="w-20 rounded-md border border-white-10 bg-white/5 px-2 py-1 text-xs text-white-100 placeholder:text-white-20 focus:outline-none focus:border-blue-500"
          />
          <span className="text-xs text-white-20 self-center">–</span>
          <input
            type="number"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="Max $"
            className="w-20 rounded-md border border-white-10 bg-white/5 px-2 py-1 text-xs text-white-100 placeholder:text-white-20 focus:outline-none focus:border-blue-500"
          />

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="ml-auto rounded-md border border-white-10 bg-sp-bg px-2 py-1 text-xs text-white-100 focus:outline-none focus:border-blue-500 [&>option]:bg-sp-bg [&>option]:text-white-100"
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {/* Listing list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-white-20 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-white-40 text-center py-12">
              No listings match your filters.
            </p>
          ) : (
            filtered.map((listing, i) => (
              <DrawerListingCard
                key={listing.providerId ?? i}
                listing={listing}
                clientId={clientId}
                savedAddresses={savedAddresses}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white-10">
            <button
              onClick={handleSaveAllFiltered}
              disabled={bulkImport.isPending}
              className="flex items-center justify-center gap-2 w-full rounded-md bg-white/5 border border-white-10 px-3 py-2 text-sm font-medium text-white-100 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {bulkImport.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BookmarkPlus className="w-4 h-4" />
              )}
              Save all filtered ({filtered.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
