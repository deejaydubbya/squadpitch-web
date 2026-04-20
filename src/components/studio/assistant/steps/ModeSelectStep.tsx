'use client';

import Link from 'next/link';
import { Megaphone, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  dispatch: React.Dispatch<AssistantAction>;
  clientId: string;
}

export function ModeSelectStep({ session, dispatch, clientId }: Props) {
  const isRE = session.industryKey === 'real_estate';

  return (
    <div className="flex flex-col h-full">
      <p className="text-sm text-white-60 mb-6">
        How would you like to create content today?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Campaign card */}
        <button
          onClick={() => dispatch({ type: 'SET_MODE', payload: 'campaign' })}
          className={cn(
            'relative flex flex-col items-start p-5 rounded-xl border text-left transition-colors',
            session.mode === 'campaign'
              ? 'border-accent-green-110 bg-accent-green-110/10'
              : 'border-white-10 hover:border-white-20 hover:bg-white-5'
          )}
        >
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-accent-green-110/20 text-accent-green-110">
            Recommended
          </span>
          <div className="w-10 h-10 rounded-lg bg-accent-green-110/20 flex items-center justify-center mb-3">
            <Megaphone className="w-5 h-5 text-accent-green-110" />
          </div>
          <h3 className="text-sm font-semibold text-white-100 mb-1">Campaign</h3>
          <p className="text-xs text-white-40">
            Multi-post campaign with AI-optimized scheduling across your channels.
          </p>
        </button>

        {/* Quick Post card */}
        <button
          onClick={() => dispatch({ type: 'SET_MODE', payload: 'quick_post' })}
          className={cn(
            'flex flex-col items-start p-5 rounded-xl border text-left transition-colors',
            session.mode === 'quick_post'
              ? 'border-accent-green-110 bg-accent-green-110/10'
              : 'border-white-10 hover:border-white-20 hover:bg-white-5'
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-white-10 flex items-center justify-center mb-3">
            <Wand2 className="w-5 h-5 text-white-60" />
          </div>
          <h3 className="text-sm font-semibold text-white-100 mb-1">Quick Post</h3>
          <p className="text-xs text-white-40">
            Single post for one channel — fast and simple.
          </p>
        </button>
      </div>

      {/* Manual fallback links */}
      <div className="mt-6 pt-4 border-t border-white-10 flex items-center gap-3 text-xs text-white-40">
        <Link
          href={`/workspaces/${clientId}/create`}
          className="hover:text-white-100 transition-colors underline underline-offset-2"
        >
          Skip assistant and create manually
        </Link>
        {isRE && (
          <>
            <span>or</span>
            <Link
              href={`/workspaces/${clientId}/listing-campaign`}
              className="hover:text-white-100 transition-colors underline underline-offset-2"
            >
              use Listing Campaign builder
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
