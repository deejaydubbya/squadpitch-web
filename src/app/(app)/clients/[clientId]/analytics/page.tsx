'use client';

import { useParams } from 'next/navigation';
import { useClientAnalytics } from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { AnalyticsStatCards } from '@/components/studio/AnalyticsStatCards';

export default function AnalyticsPage() {
  const params = useParams<{ clientId: string }>();
  const { data: analytics, isLoading, error } = useClientAnalytics(params.clientId);
  return (
    <div className="max-w-4xl">
      {isLoading && (
        <div className="flex items-center gap-2 py-6">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading analytics…</span>
        </div>
      )}
      {error && <StatusBanner error={(error as Error).message} />}
      {analytics && <AnalyticsStatCards analytics={analytics} />}
    </div>
  );
}
