import { redirect } from 'next/navigation';

export default async function VoiceRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/workspaces/${clientId}/settings/brand?section=voice`);
}
