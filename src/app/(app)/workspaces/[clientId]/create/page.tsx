'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CreateContentForm } from '@/components/studio/CreateContentForm';
import { ContentPreview } from '@/components/studio/ContentPreview';
import type { Draft } from '@/hooks/useSquadpitch';

export default function CreatePage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const searchParams = useSearchParams();
  const initialGuidance = searchParams.get('guidance') ?? undefined;
  const initialTemplateType = searchParams.get('templateType') ?? undefined;
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);

  if (generatedDraft) {
    return (
      <ContentPreview
        draft={generatedDraft}
        clientId={clientId}
        onDiscard={() => setGeneratedDraft(null)}
        onRegenerate={() => setGeneratedDraft(null)}
      />
    );
  }

  return (
    <CreateContentForm
      clientId={clientId}
      initialGuidance={initialGuidance}
      initialTemplateType={initialTemplateType}
      onGenerated={(draft) => setGeneratedDraft(draft)}
    />
  );
}
