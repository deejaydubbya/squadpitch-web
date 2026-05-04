import { redirect } from 'next/navigation';

export default function AIPersonaRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/settings/brand?section=visual`);
}
