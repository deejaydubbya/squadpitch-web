'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Search, Loader2, AlertCircle, ArrowRight,
  Bookmark, Check, Sparkles, Crown, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useListingOpportunities,
  useManualListingImport,
  useBrandProfile,
  useUpsertBrandProfile,
  useProperties,
  type UnifiedListing,
  type ManualListingInput,
} from '@/hooks/useSquadpitch';
import { ListingOpportunitiesDrawer } from './ListingOpportunitiesDrawer';

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

function storageKey(clientId: string) {
  return `sp_nearby_zip_${clientId}`;
}

// ── Scoring / Ranking ───────────────────────────────────────────────────

function computeScore(l: UnifiedListing): number {
  let score = 0;
  if (l.bedrooms != null) score += 1;
  if (l.bathrooms != null) score += 1;
  if (l.sqft != null) score += 1;
  if (l.price != null) score += 1;
  if (l.yearBuilt != null) score += 0.5;
  if (l.lotSize != null) score += 0.5;
  if (l.daysOnMarket != null && l.daysOnMarket <= 7) score += 2;
  else if (l.daysOnMarket != null && l.daysOnMarket <= 30) score += 1;
  if (!l.city || !l.state) score -= 1;
  return score;
}

export function rankListings(listings: UnifiedListing[]): UnifiedListing[] {
  return listings
    .filter(
      (l) =>
        l.status === 'active' &&
        l.price != null &&
        l.formattedAddress != null,
    )
    .sort((a, b) => computeScore(b) - computeScore(a));
}

// ── Badges ──────────────────────────────────────────────────────────────

interface Badge {
  label: string;
  className: string;
  icon?: typeof Sparkles;
}

function getBadges(
  listing: UnifiedListing,
  savedAddresses: Set<string>,
): Badge[] {
  const badges: Badge[] = [];
  if (listing.daysOnMarket != null && listing.daysOnMarket <= 7) {
    badges.push({ label: 'New', className: 'bg-green-500/20 text-green-400', icon: Sparkles });
  }
  if (listing.price != null && listing.price >= 750_000) {
    badges.push({ label: 'Luxury', className: 'bg-purple-500/20 text-purple-300', icon: Crown });
  }
  if (
    listing.price != null &&
    listing.formattedAddress &&
    listing.bedrooms != null &&
    listing.bathrooms != null &&
    listing.sqft != null
  ) {
    badges.push({ label: 'Campaign Ready', className: 'bg-blue-500/20 text-blue-400', icon: Zap });
  }
  const addr = listing.formattedAddress?.toLowerCase();
  if (addr && savedAddresses.has(addr)) {
    badges.push({ label: 'Saved', className: 'bg-white/10 text-white-60' });
  }
  return badges;
}

// ── Listing Card ────────────────────────────────────────────────────────

function ListingCard({
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
    <div className="rounded-lg border border-white-10 bg-white/[0.02] p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white-100 leading-tight line-clamp-2">
          {address}
        </p>
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

      {listing.price != null && (
        <p className="text-base font-semibold text-white-100">
          {fmtCurrency(listing.price)}
        </p>
      )}

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
      </div>
    </div>
  );
}

// ── Main Widget ─────────────────────────────────────────────────────────

export function ListingOpportunitiesWidget({ clientId }: { clientId: string }) {
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [areaResolved, setAreaResolved] = useState(false);

  const { data: brand } = useBrandProfile(clientId);
  const upsertBrand = useUpsertBrandProfile(clientId);
  const { data: properties } = useProperties(clientId);

  // Build set of saved addresses for badge matching
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

  // Area resolution: brand profile → localStorage → show setup
  useEffect(() => {
    if (areaResolved) return;

    // 1. Try brand profile
    if (brand) {
      if (brand.primaryZip) {
        setZipCode(brand.primaryZip);
        setInputValue(brand.primaryZip);
        setAreaResolved(true);
        return;
      }
      if (brand.city && brand.state) {
        setCity(brand.city);
        setState(brand.state);
        setInputValue(`${brand.city}, ${brand.state}`);
        setAreaResolved(true);
        return;
      }
    }

    // 2. Fall back to localStorage
    const saved = localStorage.getItem(storageKey(clientId));
    if (saved) {
      setZipCode(saved);
      setInputValue(saved);
      setAreaResolved(true);
      return;
    }

    // 3. No area found — show setup (but only once brand has loaded)
    if (brand !== undefined) {
      setShowSetup(true);
      setAreaResolved(true);
    }
  }, [brand, clientId, areaResolved]);

  const { data: listings, isLoading, isError, refetch } = useListingOpportunities(clientId, {
    zipCode: zipCode || undefined,
    city: city || undefined,
    state: state || undefined,
  });

  const ranked = useMemo(() => rankListings(listings ?? []), [listings]);
  const displayListings = ranked.slice(0, 4);

  // Area label for display
  const areaLabel = city && state ? `${city}, ${state}` : zipCode || '';

  const handleSearch = () => {
    const trimmed = inputValue.trim();

    // Check if input is a ZIP code
    if (/^\d{5}$/.test(trimmed)) {
      localStorage.setItem(storageKey(clientId), trimmed);
      setZipCode(trimmed);
      setCity('');
      setState('');
      setShowSetup(false);
      // Persist to brand profile
      upsertBrand.mutate({ primaryZip: trimmed });
      return;
    }

    // Check if input is "City, ST" format
    const cityStateMatch = trimmed.match(/^(.+?),\s*([A-Za-z]{2})$/);
    if (cityStateMatch) {
      const newCity = cityStateMatch[1].trim();
      const newState = cityStateMatch[2].toUpperCase();
      setCity(newCity);
      setState(newState);
      setZipCode('');
      setShowSetup(false);
      localStorage.removeItem(storageKey(clientId));
      // Persist to brand profile
      upsertBrand.mutate({ city: newCity, state: newState });
      return;
    }
  };

  const handleChangeArea = () => {
    setShowSetup(true);
    setInputValue(areaLabel);
  };

  // Setup state — no area or user clicked "Change area"
  if (showSetup || (!zipCode && !city && !isLoading && areaResolved)) {
    return (
      <div className="card p-5 border-white-10">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Listing Opportunities
          </h2>
        </div>
        <p className="text-sm text-white-40 mb-3">
          Enter a ZIP code or city to discover active listings you can turn into campaigns.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. 45255 or Cincinnati, OH"
            className="w-48 rounded-md border border-white-10 bg-white/5 px-3 py-1.5 text-sm text-white-100 placeholder:text-white-20 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={!inputValue.trim()}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="card p-5 border-white-10">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Listing Opportunities
          </h2>
          <Loader2 className="w-3.5 h-3.5 text-white-20 animate-spin ml-auto" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-white-10 bg-white/[0.02] p-3 space-y-2 animate-pulse">
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="h-5 w-1/2 rounded bg-white/10" />
              <div className="h-3 w-2/3 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="card p-5 border-white-10">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Listing Opportunities
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load listings.</span>
          <button
            onClick={() => refetch()}
            className="text-blue-400 hover:text-blue-300 font-medium ml-1"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Results state
  return (
    <>
      <div className="card p-5 border-white-10">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Listing Opportunities
          </h2>
          {areaLabel && (
            <span className="text-xs text-white-40">{areaLabel}</span>
          )}
          {ranked.length > 0 && (
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
              {ranked.length}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={handleChangeArea}
              className="text-xs text-white-40 hover:text-white-100 transition-colors"
            >
              Change area
            </button>
            {ranked.length > 4 && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {displayListings.length === 0 ? (
          <p className="text-sm text-white-40">
            No active listings found for {areaLabel}. Try a different area.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayListings.map((listing, i) => (
              <ListingCard
                key={listing.providerId ?? i}
                listing={listing}
                clientId={clientId}
                savedAddresses={savedAddresses}
              />
            ))}
          </div>
        )}
      </div>

      <ListingOpportunitiesDrawer
        clientId={clientId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialArea={{ zipCode: zipCode || undefined, city: city || undefined, state: state || undefined }}
      />
    </>
  );
}

// Keep old export name for backward compat
export { ListingOpportunitiesWidget as NearbyListingsWidget };
