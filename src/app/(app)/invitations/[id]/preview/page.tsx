import { PreviewClient } from '@/app/(public)/preview/[token]/PreviewClient';

export default async function InvitationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PreviewClient invitationId={id} />;
}
