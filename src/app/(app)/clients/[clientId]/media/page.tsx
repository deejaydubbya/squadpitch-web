import { redirect } from 'next/navigation';
export default function MediaRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/clients/${params.clientId}/settings/media`);
}
