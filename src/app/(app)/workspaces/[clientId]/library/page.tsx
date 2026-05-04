import { redirect } from 'next/navigation';

export default function LibraryRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/planner`);
}
