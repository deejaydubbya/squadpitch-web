'use client';

import { useParams } from 'next/navigation';
import { GettingStartedFlow } from '@/components/studio/getting-started/GettingStartedFlow';

export default function GettingStartedPage() {
  const params = useParams<{ clientId: string }>();
  return <GettingStartedFlow clientId={params.clientId} />;
}
