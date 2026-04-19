import { redirect } from 'next/navigation';
export default function MediaRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/settings/channels`);
}
