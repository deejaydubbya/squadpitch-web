import { redirect } from 'next/navigation';

export default function AssetsRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/media`);
}
