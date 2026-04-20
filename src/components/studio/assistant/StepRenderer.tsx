'use client';

import type { AssistantAction, AssistantSessionState, AssistantStepId } from '@/lib/assistant/types';
import { ModeSelectStep } from './steps/ModeSelectStep';
import { PropertySelectStep } from './steps/PropertySelectStep';
import { CampaignConfigStep } from './steps/CampaignConfigStep';
import { QuickPostConfigStep } from './steps/QuickPostConfigStep';
import { MediaSelectStep } from './steps/MediaSelectStep';
import { ScheduleReviewStep } from './steps/ScheduleReviewStep';
import { GenerateStep } from './steps/GenerateStep';

interface Props {
  currentStepId: AssistantStepId | null;
  session: AssistantSessionState;
  dispatch: React.Dispatch<AssistantAction>;
  clientId: string;
}

export function StepRenderer({ currentStepId, session, dispatch, clientId }: Props) {
  switch (currentStepId) {
    case null:
    case 'mode_select':
      return <ModeSelectStep session={session} dispatch={dispatch} clientId={clientId} />;
    case 'property_select':
      return <PropertySelectStep session={session} dispatch={dispatch} clientId={clientId} />;
    case 'campaign_config':
      return <CampaignConfigStep session={session} dispatch={dispatch} clientId={clientId} />;
    case 'quick_post_config':
      return <QuickPostConfigStep session={session} dispatch={dispatch} clientId={clientId} />;
    case 'media_select':
      return <MediaSelectStep session={session} dispatch={dispatch} clientId={clientId} />;
    case 'schedule_review':
      return <ScheduleReviewStep session={session} dispatch={dispatch} clientId={clientId} />;
    case 'generate':
      return <GenerateStep session={session} dispatch={dispatch} clientId={clientId} />;
  }
}
