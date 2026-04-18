'use client';

import { useRouter } from 'next/navigation';
import { Home, Archive, ArrowRight, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceDataItem } from '@/hooks/useSquadpitch';

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

interface Props {
  item: WorkspaceDataItem;
  clientId: string;
  onArchive: (id: string) => void;
}

export function PropertyCard({ item, clientId, onArchive }: Props) {
  const router = useRouter();
  const d = item.dataJson as Record<string, unknown>;
  const imageUrl = d.imageUrl as string | undefined;

  // Address
  const street = d.street as string | undefined;
  const city = d.city as string | undefined;
  const state = d.state as string | undefined;
  const zip = d.zip as string | undefined;
  const address =
    item.title && item.title !== 'Untitled Listing'
      ? item.title
      : [street, city, state, zip].filter(Boolean).join(', ') || 'Unknown address';

  // Price
  const price = typeof d.price === 'number' ? d.price : null;

  // Specs
  const specs = [
    d.beds != null ? `${d.beds} bd` : null,
    d.baths != null ? `${d.baths} ba` : null,
    d.sqft != null ? `${Number(d.sqft).toLocaleString()} sqft` : null,
  ]
    .filter(Boolean)
    .join(' \u00b7 ');

  // Status
  const status = (d.status as string) ?? '';
  const statusLabel = status.replace(/_/g, ' ');
  const statusClass = STATUS_COLORS[status] ?? 'bg-white/10 text-white-40';

  const handleCreateCampaign = () => {
    router.push(`/workspaces/${clientId}/listing-campaign?listingId=${item.id}`);
  };

  return (
    <div className="rounded-xl border border-white-10 bg-white-5 p-4 flex flex-col gap-2.5">
      {/* Image or placeholder */}
      {imageUrl ? (
        <div className="relative w-full h-32 rounded-lg overflow-hidden bg-white/[0.02]">
          <img
            src={imageUrl}
            alt={address}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-32 rounded-lg bg-white/[0.02]">
          <ImageIcon className="w-8 h-8 text-white-20" />
        </div>
      )}

      {/* Address + status */}
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

      {/* Price */}
      {price != null && (
        <p className="text-base font-semibold text-white-100">
          {fmtCurrency(price)}
        </p>
      )}

      {/* Specs */}
      {specs && <p className="text-xs text-white-40">{specs}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        <button
          onClick={handleCreateCampaign}
          className="flex items-center gap-1.5 text-xs font-medium text-accent-green-110 hover:text-accent-green-130 transition-colors"
        >
          Create Campaign <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={() => onArchive(item.id)}
          className="ml-auto p-1.5 rounded-md text-white-30 hover:text-white-100 hover:bg-white-10 transition-colors"
          title="Archive"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
