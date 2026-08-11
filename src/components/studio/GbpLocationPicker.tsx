'use client';

import { useState } from 'react';
import { X, Star, Loader2, AlertTriangle, MapPin } from 'lucide-react';
import { useGbpLocations, useSelectGbpLocation } from '@/hooks/useSquadpitch';
import { cn } from '@/lib/utils';

interface Props {
  clientId: string;
  currentLocationName: string | null;
  onClose: () => void;
}

export function GbpLocationPicker({ clientId, currentLocationName, onClose }: Props) {
  const { data, isLoading, error } = useGbpLocations(clientId);
  const select = useSelectGbpLocation(clientId);
  const [pendingName, setPendingName] = useState<string | null>(null);

  const locations = data?.locations ?? [];

  // Only treat the stored externalAccountId as a real "current
  // selection" when it's the full canonical location resource name
  // (matches /accounts/.../locations/...). Pre-picker values like
  // "accounts/123" should NOT highlight any row.
  const isCurrentSelection =
    currentLocationName && /\/locations\//.test(currentLocationName)
      ? currentLocationName
      : null;

  const handlePick = (locationName: string, locationTitle: string | null) => {
    setPendingName(locationName);
    select.mutate(
      { locationName, locationTitle: locationTitle ?? undefined },
      {
        onSuccess: () => onClose(),
        onSettled: () => setPendingName(null),
      },
    );
  };

  return (
    <div
      className="mobile-dialog-backdrop fixed inset-0 z-50 flex justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pick a Google Business Profile location"
    >
      <div
        className="mobile-dialog-surface relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-sp-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white-10">
          <h3 className="text-sm font-semibold text-white-100 flex items-center gap-2">
            <Star className="w-4 h-4" /> Pick a Google Business Profile location
          </h3>
          <button
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-white-40 transition-colors hover:bg-white-10 hover:text-white-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-xs text-white-60 mb-3">
            Squadpitch will poll reviews for the selected location every 10 minutes and
            let you reply publicly from the Inbox. You can change the location later.
          </p>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-white-60 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading locations…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-red/10 text-accent-red text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{(error as Error).message}</span>
            </div>
          )}

          {!isLoading && !error && data?.status === 'access_denied' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-zone-yellow/10 text-zone-yellow text-xs leading-snug">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>
                  Awaiting Google Business Profile API access approval. Account
                  and location connection works, but listing locations requires
                  Google allowlisting.
                </p>
                <a
                  href="https://developers.google.com/my-business/content/prereqs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[11px] font-medium underline-offset-2 hover:underline"
                >
                  Check status of API access request →
                </a>
              </div>
            </div>
          )}

          {!isLoading &&
            !error &&
            data?.status !== 'access_denied' &&
            locations.length === 0 && (
              <div className="text-sm text-white-60 py-6 text-center">
                {data?.message ??
                  'No Google Business Profile locations were found on this account.'}
              </div>
            )}

          {!isLoading && !error && locations.length > 0 && (
            <ul className="space-y-1.5 max-h-96 overflow-y-auto">
              {locations.map((loc) => {
                const isCurrent = isCurrentSelection === loc.name;
                const isPending = pendingName === loc.name;
                return (
                  <li key={loc.name}>
                    <button
                      type="button"
                      onClick={() => handlePick(loc.name, loc.title)}
                      disabled={isPending || isCurrent}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-3',
                        isCurrent
                          ? 'border-accent-green-110/30 bg-accent-green-110/10 cursor-default'
                          : 'border-white-10 hover:border-white-20 hover:bg-white-5',
                        isPending && 'opacity-50 cursor-wait',
                      )}
                    >
                      <span className="text-white-50 shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white-100 truncate">
                          {loc.title ?? 'Untitled location'}
                        </span>
                        {loc.address && (
                          <span className="block text-xs text-white-50 truncate">
                            {loc.address}
                          </span>
                        )}
                        <span className="block text-[10px] text-white-30 mt-0.5 truncate">
                          {loc.accountName}
                        </span>
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase tracking-wider text-accent-green-110 shrink-0 mt-0.5">
                          Selected
                        </span>
                      )}
                      {isPending && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white-50 shrink-0 mt-0.5" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {select.error && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-accent-red/10 text-accent-red text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{(select.error as Error).message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
