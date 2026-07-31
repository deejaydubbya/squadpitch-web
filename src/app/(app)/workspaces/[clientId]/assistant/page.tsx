import { redirect } from 'next/navigation';

export default async function AssistantRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/workspaces/${clientId}/create`);
}
