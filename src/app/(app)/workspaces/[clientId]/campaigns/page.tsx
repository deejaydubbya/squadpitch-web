import { redirect } from 'next/navigation';

export default function CampaignsPage({
  params,
}: {
  params: { clientId: string };
}) {
  redirect(`/workspaces/${params.clientId}/planner`);
}
