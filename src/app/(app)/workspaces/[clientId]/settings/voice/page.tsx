import { redirect } from 'next/navigation';

export default function VoiceRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/settings/brand?section=voice`);
}
