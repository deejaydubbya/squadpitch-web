import { PreviewClient } from './PreviewClient';

export default async function ProspectPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PreviewClient token={token} />;
}
