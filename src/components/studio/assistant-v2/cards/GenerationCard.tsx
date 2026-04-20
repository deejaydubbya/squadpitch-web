'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Copy, Check, RefreshCw } from 'lucide-react';
import {
  useGenerateListingCampaign,
  useGenerateContent,
  type Draft,
} from '@/hooks/useSquadpitch';
import { usePreferencesContext } from '@/hooks/useContentPreferences';
import { mapSessionToCampaignInput, mapSessionToQuickPostInput } from '@/lib/assistant/conversation/sessionToGeneration';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

type Phase = 'ready' | 'generating' | 'complete' | 'error';

export function GenerationCard({ session, clientId, onSelection }: Props) {
  if (session.mode === 'quick_post') {
    return <QuickPostGeneration session={session} clientId={clientId} onSelection={onSelection} />;
  }
  return <CampaignGeneration session={session} clientId={clientId} onSelection={onSelection} />;
}

// ── Campaign Generation ──────────────────────────────────────────────────

function CampaignGeneration({ session, clientId, onSelection }: Props) {
  const generateMutation = useGenerateListingCampaign(clientId);
  const preferencesContext = usePreferencesContext(clientId);

  const [phase, setPhase] = useState<Phase>('ready');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    const input = mapSessionToCampaignInput(session, preferencesContext);
    if (!input) return;

    setPhase('generating');
    setError(null);

    generateMutation.mutate(
      input,
      {
        onSuccess: (data) => {
          setPhase('complete');
          // Dispatch to session — hook will transition to campaign_review card
          onSelection(
            { type: 'SET_GENERATION_RESULT', payload: data },
            'Campaign generated successfully'
          );
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Generation failed.');
          setPhase('error');
        },
      }
    );
  };

  if (phase === 'ready') {
    const slotCount = session.slots.length;
    const days = slotCount > 0 ? Math.max(...session.slots.map((s) => s.campaignDay)) : 0;
    const channels = Array.from(new Set(session.slots.map((s) => s.channel)));

    return (
      <div className="space-y-2">
        {slotCount > 0 && (
          <p className="text-[11px] text-white-40">
            {slotCount} posts across {days} days on {channels.join(', ')}
          </p>
        )}
        <button
          onClick={handleGenerate}
          disabled={!session.propertyData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate Campaign
        </button>
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div className="flex items-center gap-3 py-3">
        <Loader2 className="w-5 h-5 text-accent-green-110 animate-spin" />
        <p className="text-xs text-white-60">Generating your campaign...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <p className="text-xs">{error}</p>
        </div>
        <button
          onClick={handleGenerate}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-100 hover:bg-white-20"
        >
          Retry
        </button>
      </div>
    );
  }

  // Complete — card is resolved, review card will appear next
  return (
    <div className="flex items-center gap-2 py-2">
      <CheckCircle2 className="w-4 h-4 text-accent-green-110" />
      <p className="text-xs text-white-60">Campaign generated — review below</p>
    </div>
  );
}

// ── Quick Post Generation ────────────────────────────────────────────────

function QuickPostGeneration({ session, clientId, onSelection }: Props) {
  const generateMutation = useGenerateContent();
  const preferencesContext = usePreferencesContext(clientId);

  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    // Map session state → generation input (state is source of truth)
    const input = mapSessionToQuickPostInput(session, clientId, preferencesContext);
    if (!input) return;

    setPhase('generating');
    setError(null);

    generateMutation.mutate(
      input,
      {
        onSuccess: (data) => {
          setResult(data);
          setPhase('complete');
          onSelection(
            { type: 'SET_GENERATION_RESULT', payload: data },
            'Post generated successfully'
          );
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Generation failed.');
          setPhase('error');
        },
      }
    );
  };

  if (phase === 'ready') {
    return (
      <button
        onClick={handleGenerate}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Generate Post
      </button>
    );
  }

  if (phase === 'generating') {
    return (
      <div className="flex items-center gap-3 py-3">
        <Loader2 className="w-5 h-5 text-accent-green-110 animate-spin" />
        <p className="text-xs text-white-60">Generating your post...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <p className="text-xs">{error}</p>
        </div>
        <button onClick={handleGenerate} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-100 hover:bg-white-20">
          Retry
        </button>
      </div>
    );
  }

  // Complete — inline review for quick post
  return <QuickPostReview result={result} clientId={clientId} onRegenerate={() => { setPhase('ready'); setResult(null); }} />;
}

// ── Quick Post Review ──────────────────────────────────────────────────

function QuickPostReview({
  result,
  clientId,
  onRegenerate,
}: {
  result: Draft | null;
  clientId: string;
  onRegenerate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(result?.body ?? '');
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const displayBody = editing ? editedBody : (editedBody !== result.body ? editedBody : result.body);

  const handleCopy = () => {
    const fullText = [
      displayBody,
      result.hashtags?.length ? result.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ') : '',
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white-10 p-3 space-y-2">
        {editing ? (
          <textarea
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            rows={5}
            className="w-full text-[13px] text-white-100 bg-white-5 border border-white-10 rounded-lg p-2 resize-none focus:outline-none focus:border-accent-green-110 leading-relaxed"
          />
        ) : (
          <p className="text-[13px] text-white-100 whitespace-pre-wrap leading-relaxed">{displayBody}</p>
        )}

        {result.hashtags && result.hashtags.length > 0 && !editing && (
          <div className="flex flex-wrap gap-1">
            {result.hashtags.map((tag, i) => (
              <span key={i} className="text-[11px] text-accent-green-110/80">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}

        {result.cta && !editing && (
          <p className="text-[11px] text-white-40 italic pt-1">CTA: {result.cta}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/workspaces/${clientId}/content`}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90"
        >
          View in Content Library
        </Link>

        <button
          onClick={() => setEditing(!editing)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          {editing ? 'Done' : 'Edit'}
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-accent-green-110" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>

        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate
        </button>
      </div>
    </div>
  );
}
