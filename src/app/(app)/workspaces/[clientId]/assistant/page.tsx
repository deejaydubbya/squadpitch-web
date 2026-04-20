'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AssistantPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/workspaces/${params.clientId}/compose`);
  }, [params.clientId, router]);

  return null;
}
