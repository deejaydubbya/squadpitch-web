import { redirect } from 'next/navigation';

export default async function QueueRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/workspaces/${clientId}/planner`);
}
