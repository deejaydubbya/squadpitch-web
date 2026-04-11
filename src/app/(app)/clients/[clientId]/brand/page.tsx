import { redirect } from 'next/navigation';
export default function BrandRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/clients/${params.clientId}/settings/brand`);
}
