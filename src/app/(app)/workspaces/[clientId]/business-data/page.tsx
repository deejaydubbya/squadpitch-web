import { redirect } from 'next/navigation';

export default function BusinessDataRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/data?tab=knowledge`);
}
