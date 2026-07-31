import { redirect } from 'next/navigation';

export default async function ListingCampaignRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ listingId?: string; type?: string }>;
}) {
  const [{ clientId }, query] = await Promise.all([params, searchParams]);
  const qs = new URLSearchParams({ mode: 'campaign' });
  if (query.listingId) qs.set('listingId', query.listingId);
  if (query.type) qs.set('type', query.type);
  redirect(`/workspaces/${clientId}/create?${qs.toString()}`);
}
