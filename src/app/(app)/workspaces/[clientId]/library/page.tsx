import { redirect } from 'next/navigation';

export default async function LibraryRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/workspaces/${clientId}/planner`);
}
