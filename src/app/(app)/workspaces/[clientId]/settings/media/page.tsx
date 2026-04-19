import { redirect } from 'next/navigation';

export default function OldMediaPage({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/settings/channels`);
}
