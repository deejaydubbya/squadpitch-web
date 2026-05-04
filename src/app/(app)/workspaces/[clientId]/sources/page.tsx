'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SourcesRedirect() {
  const params = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');

  useEffect(() => {
    if (tab === 'media') {
      router.replace(`/workspaces/${params.clientId}/media`);
    } else if (tab === 'connections') {
      router.replace(`/workspaces/${params.clientId}/settings/integrations`);
    } else {
      const qs = tab ? `?tab=${tab}` : '';
      router.replace(`/workspaces/${params.clientId}/data${qs}`);
    }
  }, [params.clientId, tab, router]);

  return null;
}
