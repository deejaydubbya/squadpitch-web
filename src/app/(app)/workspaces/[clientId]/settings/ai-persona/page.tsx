'use client';

import { useParams } from 'next/navigation';
import { BrandPersonaWizard } from '@/components/studio/brand-persona/BrandPersonaWizard';

export default function SettingsAIPersonaPage() {
  const params = useParams<{ clientId: string }>();
  return <BrandPersonaWizard clientId={params.clientId} />;
}
