'use client';

// Create-a-page wizard. Thin route wrapper; the wizard itself
// lives in _components so the logic is reusable in future
// surfaces (e.g. a "create from campaign" link in the campaigns
// list could open the same wizard pre-seeded).

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { SiteCreateWizard } from '../_components/SiteCreateWizard';

export default function NewSitePage() {
  const params = useParams<{ clientId: string }>();
  const { clientId } = params;
  return (
    <div className="space-y-6">
      <Link
        href={`/workspaces/${clientId}/sites`}
        className="inline-flex items-center gap-1.5 text-sm text-white-50 hover:text-white-100"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Sites
      </Link>
      <SiteCreateWizard clientId={clientId} />
    </div>
  );
}
