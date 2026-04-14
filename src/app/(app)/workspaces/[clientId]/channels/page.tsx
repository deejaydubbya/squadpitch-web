import { redirect } from 'next/navigation';
export default function ChannelsRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/settings/channels`);
}
