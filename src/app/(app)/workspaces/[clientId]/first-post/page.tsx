'use client';

import { useParams } from 'next/navigation';
import { FirstPostReview } from '@/components/studio/first-post/FirstPostReview';

export default function FirstPostPage() {
  const params = useParams<{ clientId: string }>();
  return <FirstPostReview clientId={params.clientId} />;
}
