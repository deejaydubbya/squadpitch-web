import { redirect } from 'next/navigation';

export default function CampaignsRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/planner`);
}
