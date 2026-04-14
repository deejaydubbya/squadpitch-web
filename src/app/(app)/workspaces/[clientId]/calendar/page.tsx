import { redirect } from 'next/navigation';
export default function CalendarRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/planner`);
}
