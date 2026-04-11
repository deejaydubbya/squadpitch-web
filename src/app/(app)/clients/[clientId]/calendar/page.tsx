import { redirect } from 'next/navigation';
export default function CalendarRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/clients/${params.clientId}/planner`);
}
