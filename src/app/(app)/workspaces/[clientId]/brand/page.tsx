import { redirect } from 'next/navigation';

export default function BrandRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/settings/brand`);
}
