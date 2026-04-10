'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Wand2,
  Loader2,
  ArrowRight,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGenerateContent,
  useGenerateMedia,
  useGenerateVideo,
  useMediaProfile,
  useClient,
  useVoiceProfile,
  useChannelSettings,
  useApproveDraft,
  useRejectDraft,
  type Channel,
  type DraftKind,
  type Draft,
} from '@/hooks/useSquadpitch';
import { StatusBanner } from '@/components/common/StatusBanner';
import { DraftPreviewCard } from './DraftPreviewCard';

interface Props {
  clientId: string;
}

const KINDS: DraftKind[] = [
  'POST',
  'CAPTION',
  'VIDEO_SCRIPT',
  'CAROUSEL',
  'HOOKS',
  'CTA_VARIANTS',
  'REPLY',
];

export function GenerateForm({ clientId }: Props) {
  const { data: client } = useClient(clientId);
  const { data: voice } = useVoiceProfile(clientId);
  const { data: channels } = useChannelSettings(clientId);
  const { data: mediaProfile } = useMediaProfile(clientId);
  const generate = useGenerateContent();
  const generateMedia = useGenerateMedia(clientId);
  const generateVideoMutation = useGenerateVideo(clientId);

  const [kind, setKind] = useState<DraftKind>('POST');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [bucketKey, setBucketKey] = useState<string>('');
  const [guidance, setGuidance] = useState('');
  const [generateImage, setGenerateImage] = useState(false);
  const [generateVideoFlag, setGenerateVideoFlag] = useState(false);
  const [lastDraft, setLastDraft] = useState<Draft | null>(null);
  const [showVoice, setShowVoice] = useState(false);

  const aiImageAvailable =
    mediaProfile?.mode === 'BRAND_ASSETS_PLUS_AI' ||
    mediaProfile?.mode === 'AI_CHARACTER';

  const enabledChannels = useMemo(
    () => channels?.filter((c) => c.isEnabled) ?? [],
    [channels]
  );

  // Auto-select first enabled channel
  useEffect(() => {
    if (!channel && enabledChannels.length > 0) {
      setChannel(enabledChannels[0].channel);
    }
  }, [channel, enabledChannels]);

  // Get maxChars for selected channel
  const selectedChannelConfig = useMemo(
    () => enabledChannels.find((c) => c.channel === channel),
    [enabledChannels, channel]
  );

  const handleGenerate = () => {
    if (!channel || !guidance.trim()) return;
    generate.mutate(
      {
        clientId,
        kind,
        channel,
        bucketKey: bucketKey || undefined,
        guidance: guidance.trim(),
      },
      {
        onSuccess: (draft) => {
          setLastDraft(draft);
          // Only clear guidance — keep kind, channel, bucket for next generation
          setGuidance('');
          if (generateImage && aiImageAvailable) {
            generateMedia.mutate({
              clientId,
              guidance: draft.imageGuidance || draft.altText || draft.body.slice(0, 500),
              draftId: draft.id,
              channel,
            });
          }
          if (generateVideoFlag) {
            generateVideoMutation.mutate({
              clientId,
              guidance: draft.imageGuidance || draft.altText || draft.body.slice(0, 500),
              draftId: draft.id,
              channel: channel ?? undefined,
            });
          }
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canGenerate) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const canGenerate =
    channel && guidance.trim().length > 0 && !generate.isPending;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="card p-5 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white-100">
            Generate content
          </h2>
          <p className="text-sm text-white-40 mt-0.5">
            Uses OpenAI with {client?.name}&apos;s brand + voice profile.
          </p>
        </div>

        {/* Voice profile summary */}
        {voice && (
          <div>
            <button
              onClick={() => setShowVoice((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-white-40 hover:text-white-60"
            >
              {showVoice ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              Voice profile
              {voice.tone && (
                <span className="text-white-60 font-medium ml-1 truncate max-w-[300px]">
                  — {voice.tone.slice(0, 80)}
                </span>
              )}
            </button>
            {showVoice && (
              <div className="mt-2 p-3 rounded-lg bg-white-5 border border-white-10 space-y-2 text-xs">
                {voice.tone && (
                  <p className="text-white-80">{voice.tone}</p>
                )}
                {voice.voiceRulesJson?.do?.length > 0 && (
                  <div>
                    <span className="text-zone-green font-medium">Do: </span>
                    <span className="text-white-60">
                      {voice.voiceRulesJson.do.join(' · ')}
                    </span>
                  </div>
                )}
                {voice.voiceRulesJson?.dont?.length > 0 && (
                  <div>
                    <span className="text-accent-red font-medium">Don&apos;t: </span>
                    <span className="text-white-60">
                      {voice.voiceRulesJson.dont.join(' · ')}
                    </span>
                  </div>
                )}
                {voice.bannedPhrases?.length > 0 && (
                  <div>
                    <span className="text-white-40 font-medium">Banned: </span>
                    <span className="text-white-60 font-mono">
                      {voice.bannedPhrases.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
            Kind
          </label>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  kind === k
                    ? 'bg-accent-green-110 text-sp-surface'
                    : 'bg-white-10 text-white-60 hover:bg-white-20'
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
            Channel
          </label>
          {enabledChannels.length === 0 ? (
            <p className="text-xs text-white-40 italic">
              No channels enabled. Go to Media → Channels to enable one.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {enabledChannels.map((c) => (
                <button
                  key={c.channel}
                  type="button"
                  onClick={() => setChannel(c.channel)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    channel === c.channel
                      ? 'bg-accent-green-110 text-sp-surface'
                      : 'bg-white-10 text-white-60 hover:bg-white-20'
                  )}
                >
                  {c.channel}
                </button>
              ))}
            </div>
          )}
        </div>

        {voice?.contentBuckets && voice.contentBuckets.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
              Content bucket (optional)
            </label>
            <select
              value={bucketKey}
              onChange={(e) => setBucketKey(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
            >
              <option value="" className="bg-[#1a1a1a] text-white">— none —</option>
              {voice.contentBuckets.map((b) => (
                <option key={b.key} value={b.key} className="bg-[#1a1a1a] text-white">
                  {b.label} ({b.key})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
              Guidance
            </label>
            <span className="text-xs text-white-40 font-mono">
              {guidance.length}/4000
            </span>
          </div>
          <textarea
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Introduce protein timing for marathon runners, mention our coaching plan."
            rows={4}
            maxLength={4000}
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
          />
        </div>

        {aiImageAvailable && (
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={generateImage}
              onChange={(e) => setGenerateImage(e.target.checked)}
              className="mt-0.5 accent-accent-green-110"
            />
            <div>
              <span className="text-sm text-white-80 group-hover:text-white-100 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Also generate image
              </span>
              <span className="text-xs text-white-40 block mt-0.5">
                AI will create an image based on the generated content
              </span>
            </div>
          </label>
        )}

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={generateVideoFlag}
            onChange={(e) => setGenerateVideoFlag(e.target.checked)}
            className="mt-0.5 accent-accent-green-110"
          />
          <div>
            <span className="text-sm text-white-80 group-hover:text-white-100 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" />
              Also generate video
            </span>
            <span className="text-xs text-white-40 block mt-0.5">
              AI will create a video based on the generated content
            </span>
          </div>
        </label>

        {generate.error && (
          <StatusBanner error={(generate.error as Error).message} />
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            {generate.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            Generate
          </button>
          <span className="text-[10px] text-white-40">Ctrl+Enter</span>
          <Link
            href={`/clients/${clientId}/queue`}
            className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
          >
            Go to queue <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {lastDraft && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Latest result
          </h3>
          <DraftPreviewCard
            draft={lastDraft}
            maxChars={selectedChannelConfig?.maxChars}
          />

          {/* Quick approve/reject on result */}
          <QuickActions draft={lastDraft} />

          {generateMedia.isPending && (
            <div className="flex items-center gap-2 text-sm text-white-60 px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating image…
            </div>
          )}
          {generateMedia.isSuccess && (
            <div className="flex items-center gap-2 text-sm text-accent-green-110 px-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Image generated and attached
            </div>
          )}
          {generateMedia.error && (
            <div className="flex items-center gap-2 text-sm text-red-400 px-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Image generation failed: {(generateMedia.error as Error).message}
            </div>
          )}
          {generateVideoMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-white-60 px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating video…
            </div>
          )}
          {generateVideoMutation.isSuccess && (
            <div className="flex items-center gap-2 text-sm text-accent-green-110 px-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Video generation queued
            </div>
          )}
          {generateVideoMutation.error && (
            <div className="flex items-center gap-2 text-sm text-red-400 px-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Video generation failed: {(generateVideoMutation.error as Error).message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Inline approve/reject for the just-generated draft. */
function QuickActions({ draft }: { draft: Draft }) {
  const approve = useApproveDraft(draft.id);
  const reject = useRejectDraft(draft.id);
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);

  if (draft.status !== 'DRAFT') return null;
  if (approved || rejected) {
    return (
      <p className="text-xs text-white-40 px-1">
        {approved ? 'Approved.' : 'Rejected.'}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 px-1">
      <button
        onClick={() =>
          approve.mutate({ onSuccess: () => setApproved(true) })
        }
        disabled={approve.isPending}
        className="text-xs px-2.5 py-1 rounded-md bg-zone-green/20 text-zone-green hover:bg-zone-green/30 flex items-center gap-1 disabled:opacity-50"
      >
        {approve.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3 h-3" />
        )}
        Approve
      </button>
      <button
        onClick={() =>
          reject.mutate('Not suitable', { onSuccess: () => setRejected(true) })
        }
        disabled={reject.isPending}
        className="text-xs px-2.5 py-1 rounded-md bg-accent-red/20 text-accent-red hover:bg-accent-red/30 flex items-center gap-1 disabled:opacity-50"
      >
        {reject.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <X className="w-3 h-3" />
        )}
        Reject
      </button>
    </div>
  );
}
