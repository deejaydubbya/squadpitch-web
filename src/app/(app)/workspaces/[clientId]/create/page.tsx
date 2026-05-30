'use client';

// Unified Create entry — drops straight into the AI Assistant. The
// assistant's first interactive card is its own Campaign/Single Post
// mode-pick, so no separate landing screen is needed.
//
// Deep links use the canonical contract documented in
// lib/assistant/createRouteParams.ts; legacy `?mode=` / `?listingId=` /
// `?type=` / `?input=` aliases still resolve transparently.
//
// Examples:
//   /create
//   /create?intent=campaign
//   /create?intent=campaign&sourceType=property&sourceId=cmxxx
//   /create?intent=campaign&sourceType=idea&prompt=Promote%20spring%20offer
//   /create?intent=single_post&sourceType=content_asset&sourceId=cmxxx
//   /create?mode=campaign           (legacy → intent=campaign)
//   /create?mode=campaign&listingId=cmxxx  (legacy → property prefill)

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ConversationalShell } from '@/components/studio/assistant-v2/ConversationalShell';
import {
  parseCreateRouteParams,
  intentToAssistantMode,
  sourceTypeToAssistantSource,
} from '@/lib/assistant/createRouteParams';

export default function CreatePage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const searchParams = useSearchParams();

  // Build the prefill payload from the URL contract. useMemo so the
  // shell's mount-time effect doesn't keep getting a fresh object on
  // every render — that would re-trigger the prefill apply.
  const prefill = useMemo(() => {
    const parsed = parseCreateRouteParams(searchParams);
    const mode = intentToAssistantMode(parsed.intent);
    if (!mode) {
      // Without an intent we hand the shell undefined → the assistant
      // opens to its own Campaign/Single-Post picker.
      return undefined;
    }
    return {
      mode,
      sourceType: sourceTypeToAssistantSource(parsed.sourceType),
      sourceId: parsed.sourceId,
      // URL-02: forward sourceUrl so the URL-intake card receives
      // the URL via prefill instead of waiting for the user to
      // paste it again.
      sourceUrl: parsed.sourceUrl,
      prompt: parsed.prompt,
      campaignType: parsed.campaignType,
      channel: parsed.channel,
      guidance: parsed.guidance,
    };
  }, [searchParams]);

  return (
    <div className="fixed inset-0 lg:left-64 z-10 bg-sp-bg">
      <ConversationalShell clientId={clientId} initialPrefill={prefill} />
    </div>
  );
}
