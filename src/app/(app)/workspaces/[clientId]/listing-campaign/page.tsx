import { redirect } from 'next/navigation';

export default function ListingCampaignRedirect({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { listingId?: string; type?: string };
}) {
  const qs = new URLSearchParams({ mode: 'campaign' });
  if (searchParams.listingId) qs.set('listingId', searchParams.listingId);
  if (searchParams.type) qs.set('type', searchParams.type);
  redirect(`/workspaces/${params.clientId}/create?${qs.toString()}`);
}
