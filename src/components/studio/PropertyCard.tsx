'use client';

import { useRouter } from 'next/navigation';
import { Home, Archive, ArrowRight, ImageIcon, Camera, Calendar, Pencil } from 'lucide-react';
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
  onEdit?: () => void;
  onClick?: () => void;
}

export function PropertyCard({ item, clientId, onArchive, onEdit, onClick }: Props) {
  const router = useRouter();
  const d = item.dataJson as Record<string, unknown>;

  // Image precedence (spinstr-sites-01):
  //   _photos[isPrimary].url  > imageUrl > images[0]
  // Photo count is the union of all three sources, deduped.
  const photoMeta = Array.isArray(d._photos)
    ? (d._photos as Array<{ url?: string; isPrimary?: boolean }>)
    : [];
  const primaryFromMeta = photoMeta.find((p) => p?.isPrimary === true)?.url;
  const imageUrl = (d.imageUrl as string | undefined) ?? undefined;
  const images = (d.images as string[] | undefined) ?? [];
  const heroImage = primaryFromMeta ?? imageUrl ?? images[0] ?? undefined;
  const allUrls = new Set<string>();
  if (heroImage) allUrls.add(heroImage);
  for (const p of photoMeta) if (typeof p?.url === 'string') allUrls.add(p.url);
  for (const u of images) if (typeof u === 'string') allUrls.add(u);
  if (imageUrl) allUrls.add(imageUrl);
  const photoCount = allUrls.size;

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

  // Specs — use bedrooms/bathrooms (ingestion pipeline field names)
  const beds = d.bedrooms ?? d.beds;
  const baths = d.bathrooms ?? d.baths;
  const specs = [
    beds != null ? `${beds} bd` : null,
    baths != null ? `${baths} ba` : null,
    d.sqft != null ? `${Number(d.sqft).toLocaleString()} sqft` : null,
  ]
    .filter(Boolean)
    .join(' \u00b7 ');

  // Property type + year built
  const propertyType = d.propertyType as string | undefined;
  const yearBuilt = d.yearBuilt as string | number | undefined;

  // Status
  const status = (d.status as string) ?? '';
  const statusLabel = status.replace(/_/g, ' ');
  const statusClass = STATUS_COLORS[status] ?? 'bg-white/10 text-white-40';

  const handleCreateCampaign = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(
      `/workspaces/${clientId}/create?intent=campaign&sourceType=property&sourceId=${item.id}`,
    );
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive(item.id);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-white-10 bg-white-5 p-4 flex flex-col gap-2.5 transition-colors',
        onClick && 'cursor-pointer hover:border-white-20 hover:bg-white/[0.06]'
      )}
    >
      {/* Image or placeholder */}
      {heroImage ? (
        <div className="relative w-full h-32 rounded-lg overflow-hidden bg-white/[0.02]">
          <img
            src={heroImage}
            alt={address}
            className="w-full h-full object-cover"
          />
          {photoCount > 1 && (
            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] font-semibold text-white">
              <Camera className="w-3 h-3" /> {photoCount}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-32 rounded-lg bg-white/[0.02] gap-1.5">
          <Camera className="w-6 h-6 text-white-20" />
          <span className="text-[10px] text-white-30 font-medium">Add photos</span>
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

      {/* Property type + year built */}
      {(propertyType || yearBuilt) && (
        <div className="flex items-center gap-2 text-[11px] text-white-30">
          {propertyType && <span>{propertyType}</span>}
          {propertyType && yearBuilt && <span>·</span>}
          {yearBuilt && (
            <span className="flex items-center gap-0.5">
              <Calendar className="w-3 h-3" /> {yearBuilt}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        <button
          onClick={handleCreateCampaign}
          className="flex min-h-11 items-center gap-1.5 text-xs font-medium text-accent-green-110 transition-colors hover:text-accent-green-130"
        >
          New Campaign <ArrowRight className="w-3 h-3" />
        </button>
        {onEdit && (
          <button
            data-testid="property-card-edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-md text-white-30 transition-colors hover:bg-white-10 hover:text-white-100"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={handleArchive}
          className={cn(
            'flex min-h-11 min-w-11 items-center justify-center rounded-md text-white-30 transition-colors hover:bg-white-10 hover:text-white-100',
            !onEdit && 'ml-auto',
          )}
          title="Archive"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
