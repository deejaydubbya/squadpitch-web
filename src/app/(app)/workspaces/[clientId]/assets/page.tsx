import { redirect } from 'next/navigation';

export default function MediaLibraryPage({
  params,
}: {
  params: { clientId: string };
}) {
  redirect(`/workspaces/${params.clientId}/sources?tab=media`);
}
