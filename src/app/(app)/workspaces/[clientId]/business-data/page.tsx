import { redirect } from 'next/navigation';

export default function BusinessDataPage({
  params,
}: {
  params: { clientId: string };
}) {
  redirect(`/workspaces/${params.clientId}/sources?tab=knowledge`);
}
