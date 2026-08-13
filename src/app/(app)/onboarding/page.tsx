'use client';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { VerifiedWorkspaceGate } from '@/components/onboarding/VerifiedWorkspaceGate';

export default function OnboardingPage() {
  return <VerifiedWorkspaceGate><OnboardingShell /></VerifiedWorkspaceGate>;
}
