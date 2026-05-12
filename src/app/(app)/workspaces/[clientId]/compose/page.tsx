import { redirect } from 'next/navigation';

export default function ComposeRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/create`);
}
