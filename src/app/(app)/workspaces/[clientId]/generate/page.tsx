import { redirect } from 'next/navigation';
export default function GenerateRedirect({ params }: { params: { clientId: string } }) {
  redirect(`/workspaces/${params.clientId}/create`);
}
