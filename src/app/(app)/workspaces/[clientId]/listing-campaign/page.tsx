'use client';

import { useParams } from 'next/navigation';
import { ListingCampaignPage } from '@/components/studio/ListingCampaignPage';

export default function Page() {
  const params = useParams<{ clientId: string }>();
  return <ListingCampaignPage clientId={params.clientId} />;
}
