'use client';

// Page editor route. Loads a SitePage by id, then mounts the
// PageEditor component which handles all the block manipulation
// state. Kept thin so the editor logic can be reused (e.g. for
// future preview / autopilot integrations).

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { useClient } from '@/hooks/useSquadpitch';
import { usePage, useForms } from '@/hooks/useSites';
import { PageEditor } from '../../_components/PageEditor';

export default function PageEditorPage() {
  const params = useParams<{ clientId: string; pageId: string }>();
  const { clientId, pageId } = params;

  const { data: client } = useClient(clientId);
  const { data: page, isLoading, isError } = usePage(clientId, pageId);
  const { data: forms } = useForms(clientId);

  return (
    <div className="space-y-6">
      <Link
        href={`/workspaces/${clientId}/sites`}
        className="inline-flex items-center gap-1.5 text-sm text-white-50 hover:text-white-100"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Sites
      </Link>

      {isLoading && (
        <div className="card p-6 text-sm text-white-50">Loading page…</div>
      )}

      {isError && (
        <div className="card p-6 flex items-center gap-2 text-sm text-accent-red">
          <AlertCircle className="w-4 h-4" />
          Page not found
        </div>
      )}

      {page && (
        <PageEditor
          clientId={clientId}
          clientSlug={client?.slug ?? null}
          page={page}
          forms={forms ?? []}
        />
      )}
    </div>
  );
}
