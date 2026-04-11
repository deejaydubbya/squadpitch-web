import { redirect } from 'next/navigation';
export default function QueueRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/clients/${params.clientId}/planner`);
}
