'use client';

// Admin/dev-only manual trigger for batch Meta insights sync.
//
// Calls POST /api/v1/workspaces/:id/metrics/sync-meta which iterates
// every PUBLISHED Facebook + Instagram draft with an externalPostId
// and hits the Graph API insights endpoints. Used to satisfy Meta App
// Review's "required API call" detection — a reviewer or on-call dev
// triggers this after reconnecting an account with the new
// read_insights / instagram_manage_insights scopes.
//
// Visibility gate: rendered only for users with admin/developer roles
// OR when NEXT_PUBLIC_META_APP_REVIEW_DEMO=true. The backend route
// also enforces requireInternalAccess, so a non-admin who hits the
// endpoint directly still gets 403.

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useSyncMetaInsights,
  type SyncMetaInsightsResult,
} from '@/hooks/useSquadpitch';
import { isMetaAppReviewDemo } from '@/lib/metaAppReviewDemo';

interface Props {
  clientId: string;
}

export function MetaInsightsSyncButton({ clientId }: Props) {
  const { isInternalUser } = useCurrentUser();
  const isDemo = isMetaAppReviewDemo();
  const sync = useSyncMetaInsights(clientId);
  const [lastResult, setLastResult] = useState<SyncMetaInsightsResult | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isInternalUser && !isDemo) return null;

  const onClick = async () => {
    setErrorMessage(null);
    try {
      const result = await sync.mutateAsync();
      setLastResult(result);
    } catch (err) {
      setLastResult(null);
      setErrorMessage((err as Error)?.message ?? 'Sync failed');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={onClick}
        disabled={sync.isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white-10 bg-white-5 text-white-100 hover:bg-white-10 disabled:opacity-50 transition-colors"
      >
        {sync.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        {sync.isPending ? 'Syncing Meta insights…' : 'Sync Meta insights'}
      </button>
      {lastResult && !sync.isPending && (
        <span className="text-white-40">
          Synced {lastResult.synced} post
          {lastResult.synced === 1 ? '' : 's'}
          {lastResult.failed > 0 && (
            <>
              ,{' '}
              <span className="text-amber-400">
                {lastResult.failed} failed
              </span>
            </>
          )}
          {lastResult.synced > 0 && (
            <>
              {' · '}
              <span className="text-blue-300/80">Source: Meta API</span>
            </>
          )}
        </span>
      )}
      {errorMessage && (
        <span className="text-red-400">{errorMessage}</span>
      )}
    </div>
  );
}
