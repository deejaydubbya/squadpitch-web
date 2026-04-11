import { redirect } from 'next/navigation';
export default function ChannelsRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/clients/${params.clientId}/settings/channels`);
}
