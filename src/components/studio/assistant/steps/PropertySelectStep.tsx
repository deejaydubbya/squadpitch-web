'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties } from '@/hooks/useSquadpitch';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { useIndustryTerminology } from '@/hooks/useIndustryTerminology';

interface Props {
  session: AssistantSessionState;
  dispatch: React.Dispatch<AssistantAction>;
  clientId: string;
}

export function PropertySelectStep({ session, dispatch, clientId }: Props) {
  const { data: properties, isLoading } = useProperties(clientId);
  const t = useIndustryTerminology(session.industryKey);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="w-6 h-6 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
        <div className="w-12 h-12 rounded-xl bg-white-10 flex items-center justify-center mb-4">
          <Home className="w-6 h-6 text-white-40" />
        </div>
        <p className="text-sm text-white-60 mb-3">No saved {t.itemPlural}</p>
        <Link
          href={`/workspaces/${clientId}/sources`}
          className="text-xs text-accent-green-110 hover:underline"
        >
          Add {t.itemPlural} in Sources
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
      {session.mode === 'campaign' && (
        <p className="text-sm text-white-60 mb-2">
          Select the {t.itemSingular} for this campaign.
        </p>
      )}
      {session.mode === 'quick_post' && (
        <p className="text-sm text-white-60 mb-2">
          Want to base this post on a {t.itemSingular}? Select one below, or skip to write freely.
        </p>
      )}
      {properties.map((item) => {
        const data = item.dataJson ?? {};
        const address = (data.address as string) || item.title || `Untitled ${t.itemSingular}`;
        const price = data.price as string | undefined;
        const beds = data.bedrooms as number | undefined;
        const baths = data.bathrooms as number | undefined;
        const sqft = data.squareFeet as number | undefined;
        const isSelected = session.selectedPropertyId === item.id;

        return (
          <button
            key={item.id}
            onClick={() => dispatch({ type: 'SET_PROPERTY', payload: { id: item.id, data: item.dataJson } })}
            className={cn(
              'flex flex-col items-start p-4 rounded-lg border text-left transition-colors',
              isSelected
                ? 'border-accent-green-110 bg-accent-green-110/10'
                : 'border-white-10 hover:border-white-20 hover:bg-white-5'
            )}
          >
            <p className="text-sm font-medium text-white-100 truncate w-full">{address}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-white-40">
              {price && <span>{price}</span>}
              {beds != null && <span>{beds} bed</span>}
              {baths != null && <span>{baths} bath</span>}
              {sqft != null && <span>{sqft.toLocaleString()} sqft</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
