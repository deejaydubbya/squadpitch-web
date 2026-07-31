import { redirect } from 'next/navigation';

export default async function ComposeRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/workspaces/${clientId}/create`);
}
