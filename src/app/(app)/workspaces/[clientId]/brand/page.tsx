import { redirect } from 'next/navigation';

export default async function BrandRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(`/workspaces/${clientId}/settings/brand`);
}
