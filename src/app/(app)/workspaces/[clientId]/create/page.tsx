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
  const [pendingAssetId, setPendingAssetId] = useState<string | undefined>();

  if (generatedDraft) {
    return (
      <ContentPreview
        draft={generatedDraft}
        clientId={clientId}
        pendingAssetId={pendingAssetId}
        onDiscard={() => { setGeneratedDraft(null); setPendingAssetId(undefined); }}
        onRegenerate={() => { setGeneratedDraft(null); setPendingAssetId(undefined); }}
      />
    );
  }

  return (
    <CreateContentForm
      clientId={clientId}
      initialGuidance={initialGuidance}
      initialTemplateType={initialTemplateType}
      onGenerated={(draft, assetId) => { setGeneratedDraft(draft); setPendingAssetId(assetId); }}
    />
  );
}
