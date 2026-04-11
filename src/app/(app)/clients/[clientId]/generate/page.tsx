import { redirect } from 'next/navigation';
export default function GenerateRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/clients/${params.clientId}/create`);
}
