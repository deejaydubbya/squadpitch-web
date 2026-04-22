'use client';

import Link from 'next/link';
import { Database, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties } from '@/hooks/useSquadpitch';
import { useIndustryTerminology } from '@/hooks/useIndustryTerminology';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function PropertySelectCard({ session, clientId, onSelection }: Props) {
  const { data: properties, isLoading } = useProperties(clientId);
  const t = useIndustryTerminology(session.industryKey);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="flex flex-col items-center py-5 px-4 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-white-5 flex items-center justify-center">
          <Database className="w-5 h-5 text-white-30" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-white-80">No {t.itemPlural} yet</p>
          <p className="text-xs text-white-40 max-w-[260px]">
            To create a listing campaign, you need at least one {t.itemSingular} in your library.
            Add {t.itemPlural} from the Sources page first.
          </p>
        </div>
        <Link
          href={`/workspaces/${clientId}/sources`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
        >
          Go to Sources
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
      {properties.map((item) => {
        const data = item.dataJson ?? {};
        const address = (data.address as string) || item.title || `Untitled ${t.itemSingular}`;
        const price = data.price as string | undefined;
        const beds = data.bedrooms as number | undefined;
        const baths = data.bathrooms as number | undefined;

        return (
          <button
            key={item.id}
            onClick={() =>
              onSelection(
                { type: 'SET_PROPERTY', payload: { id: item.id, data: item.dataJson } },
                `${t.itemSingular.charAt(0).toUpperCase() + t.itemSingular.slice(1)}: ${address}`
              )
            }
            className={cn(
              'w-full flex flex-col items-start p-2.5 rounded-lg border text-left transition-colors',
              'border-white-10 hover:border-accent-green-110/50 hover:bg-accent-green-110/5'
            )}
          >
            <p className="text-xs font-medium text-white-100 truncate w-full">{address}</p>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white-40">
              {price && <span>{price}</span>}
              {beds != null && <span>{beds} bed</span>}
              {baths != null && <span>{baths} bath</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
