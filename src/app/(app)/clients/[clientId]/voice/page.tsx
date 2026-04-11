import { redirect } from 'next/navigation';
export default function VoiceRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/clients/${params.clientId}/settings/voice`);
}
