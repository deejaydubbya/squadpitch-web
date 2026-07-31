import { redirect } from 'next/navigation';

export default async function BusinessDataRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/workspaces/${clientId}/data?tab=knowledge`);
}
