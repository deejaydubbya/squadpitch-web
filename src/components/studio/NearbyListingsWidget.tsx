'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Loader2, AlertCircle, ArrowRight, Bookmark, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useNearbyListings,
  useManualListingImport,
  type UnifiedListing,
  type ManualListingInput,
} from '@/hooks/useSquadpitch';

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

function NearbyListingCard({
  listing,
  clientId,
}: {
  listing: UnifiedListing;
  clientId: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const manualImport = useManualListingImport(clientId);
  const address = listing.formattedAddress ?? listing.street ?? 'Unknown address';
  const statusLabel = listing.status?.replace(/_/g, ' ') ?? '';
  const statusClass = STATUS_COLORS[listing.status ?? ''] ?? 'bg-white/10 text-white-40';

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
              statusClass
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

export function NearbyListingsWidget({ clientId }: { clientId: string }) {
  const [zipCode, setZipCode] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  // Load saved ZIP from localStorage (SSR-safe)
  useEffect(() => {
    const saved = localStorage.getItem(storageKey(clientId));
    if (saved) {
      setZipCode(saved);
      setInputValue(saved);
    } else {
      setShowSetup(true);
    }
  }, [clientId]);

  const { data: listings, isLoading, isError, refetch } = useNearbyListings(clientId, zipCode);

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (!/^\d{5}$/.test(trimmed)) return;
    localStorage.setItem(storageKey(clientId), trimmed);
    setZipCode(trimmed);
    setShowSetup(false);
  };

  const handleChangeArea = () => {
    setShowSetup(true);
    setInputValue(zipCode);
  };

  // Setup state — no ZIP or user clicked "Change area"
  if (showSetup || (!zipCode && !isLoading)) {
    return (
      <div className="card p-5 border-white-10">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Nearby Listings
          </h2>
        </div>
        <p className="text-sm text-white-40 mb-3">
          Enter your market ZIP code to discover active listings you can turn into campaigns.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.replace(/\D/g, '').slice(0, 5))}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. 45255"
            className="w-28 rounded-md border border-white-10 bg-white/5 px-3 py-1.5 text-sm text-white-100 placeholder:text-white-20 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={!/^\d{5}$/.test(inputValue.trim())}
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
            Nearby Listings
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
            Nearby Listings
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
  const displayListings = (listings ?? []).slice(0, 6);

  return (
    <div className="card p-5 border-white-10">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
          Nearby Listings
        </h2>
        {displayListings.length > 0 && (
          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
            {displayListings.length}
          </span>
        )}
        <button
          onClick={handleChangeArea}
          className="ml-auto text-xs text-white-40 hover:text-white-100 transition-colors"
        >
          Change area
        </button>
      </div>

      {displayListings.length === 0 ? (
        <p className="text-sm text-white-40">
          No active listings found for ZIP {zipCode}. Try a different area.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {displayListings.map((listing, i) => (
            <NearbyListingCard
              key={listing.providerId ?? i}
              listing={listing}
              clientId={clientId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
