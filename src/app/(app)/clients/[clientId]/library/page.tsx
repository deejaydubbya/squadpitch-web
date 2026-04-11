'use client';
import { useParams } from 'next/navigation';
import { ContentLibrary } from '@/components/studio/ContentLibrary';
export default function LibraryPage() {
  const params = useParams<{ clientId: string }>();
  return <ContentLibrary clientId={params.clientId} />;
}
