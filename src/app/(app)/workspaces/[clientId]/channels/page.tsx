import { redirect } from 'next/navigation';

export default async function ChannelsRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/workspaces/${clientId}/settings/channels`);
}
