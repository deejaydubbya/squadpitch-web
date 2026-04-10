'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDrafts } from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { CalendarGrid } from '@/components/studio/CalendarGrid';

export default function CalendarPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const scheduled = useDrafts({ clientId, status: 'SCHEDULED', limit: 200 });
  const published = useDrafts({ clientId, status: 'PUBLISHED', limit: 200 });
  const drafts = useMemo(
    () => [...(scheduled.data ?? []), ...(published.data ?? [])],
    [scheduled.data, published.data]
  );
  const isLoading = scheduled.isLoading || published.isLoading;
  const error = scheduled.error || published.error;
  return (
    <div className="space-y-4 max-w-5xl">
      {isLoading && (
        <div className="flex items-center gap-2 py-6">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading calendar…</span>
        </div>
      )}
      {error && <StatusBanner error={(error as Error).message} />}
      {!isLoading && !error && <CalendarGrid drafts={drafts} />}
    </div>
  );
}
