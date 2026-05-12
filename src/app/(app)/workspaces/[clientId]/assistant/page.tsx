import { redirect } from 'next/navigation';

export default function AssistantRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/create`);
}
