import { redirect } from 'next/navigation';

export default async function AIPersonaRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/workspaces/${clientId}/settings/brand?section=visual`);
}
