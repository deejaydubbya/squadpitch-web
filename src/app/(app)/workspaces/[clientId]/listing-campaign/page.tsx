'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useClient } from '@/hooks/useSquadpitch';
import { ListingCampaignPage } from '@/components/studio/ListingCampaignPage';

export default function Page() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const { data: client, isLoading } = useClient(params.clientId);

  useEffect(() => {
    if (!isLoading && client && client.industryKey !== 'real_estate') {
      router.replace(`/workspaces/${params.clientId}`);
    }
  }, [client, isLoading, params.clientId, router]);

  if (isLoading) return null;
  if (client && client.industryKey !== 'real_estate') return null;

  return <ListingCampaignPage clientId={params.clientId} />;
}
