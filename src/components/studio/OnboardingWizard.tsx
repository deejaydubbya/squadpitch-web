'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Wand2,
  Globe,
  Target,
  Share2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCreateClient,
  useUpsertBrandProfile,
  useUpsertVoiceProfile,
  useUpsertChannelSettings,
  useGenerateContent,
  type Channel,
  type Draft,
} from '@/hooks/useSquadpitch';
import { StatusBanner } from '@/components/common/StatusBanner';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

const STEPS = [
  { label: 'Your brand', icon: Globe },
  { label: 'Your goal', icon: Target },
  { label: 'Platforms', icon: Share2 },
  { label: 'First post', icon: Sparkles },
];

const GOALS = [
  { id: 'growth', label: 'Growth', desc: 'Grow your audience and followers' },
  { id: 'engagement', label: 'Engagement', desc: 'Build community and spark conversations' },
  { id: 'leads', label: 'Leads & Sales', desc: 'Drive traffic and convert customers' },
] as const;

const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'INSTAGRAM', label: 'Instagram' },
  { id: 'TIKTOK', label: 'TikTok' },
  { id: 'LINKEDIN', label: 'LinkedIn' },
  { id: 'X', label: 'X (Twitter)' },
  { id: 'FACEBOOK', label: 'Facebook' },
  { id: 'YOUTUBE', label: 'YouTube' },
];

const VOICE_PRESETS: Record<string, { tone: string; doRules: string[]; dontRules: string[] }> = {
  growth: {
    tone: 'Friendly, approachable, and motivating',
    doRules: [
      'Use inclusive language (we, you, together)',
      'Share actionable tips and insights',
      'Be encouraging and optimistic',
    ],
    dontRules: [
      'Sound corporate or overly formal',
      'Use jargon without explanation',
      'Be pushy or aggressive',
    ],
  },
  engagement: {
    tone: 'Conversational, witty, and relatable',
    doRules: [
      'Ask questions to spark discussion',
      'Share personal stories and behind-the-scenes',
      'Use humor when appropriate',
    ],
    dontRules: [
      'Post one-directional announcements only',
      'Ignore audience responses',
      'Sound robotic or templated',
    ],
  },
  leads: {
    tone: 'Professional, confident, and value-driven',
    doRules: [
      'Lead with clear value propositions',
      'Include strong calls to action',
      'Share social proof and results',
    ],
    dontRules: [
      'Be vague about what you offer',
      'Sound desperate or salesy',
      'Forget the call to action',
    ],
  },
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');

  // Step 2 state
  const [goal, setGoal] = useState<keyof typeof VOICE_PRESETS | ''>('');

  // Step 3 state
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);

  // Step 4 state
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const createClient = useCreateClient();
  const generate = useGenerateContent();

  const [error, setError] = useState<string | null>(null);

  const toggleChannel = (ch: Channel) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 0: return name.trim().length > 0;
      case 1: return goal !== '';
      case 2: return selectedChannels.length > 0;
      default: return false;
    }
  };

  // Step 4: Create everything and generate first post
  const handleSetupAndGenerate = async () => {
    setIsSettingUp(true);
    setError(null);

    try {
      // 1. Create client
      const slug = slugify(name);
      const client = await createClient.mutateAsync({ name: name.trim(), slug });
      setCreatedClientId(client.id);

      // 2. Setup brand profile
      const brandBody: Record<string, unknown> = {};
      if (website.trim()) brandBody.website = website.trim();
      brandBody.description = `${name.trim()} — managed via Squadpitch`;

      await fetch(`/api/proxy/clients/${client.id}/brand`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandBody),
      });

      // 3. Setup voice profile from goal preset
      const preset = VOICE_PRESETS[goal as string];
      if (preset) {
        await fetch(`/api/proxy/clients/${client.id}/voice`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tone: preset.tone,
            voiceRulesJson: { do: preset.doRules, dont: preset.dontRules },
            bannedPhrases: [],
            contentBuckets: [
              { key: 'educational', label: 'Educational', template: 'Share knowledge or tips' },
              { key: 'promotional', label: 'Promotional', template: 'Promote products or services' },
              { key: 'storytelling', label: 'Storytelling', template: 'Tell a brand story' },
            ],
          }),
        });
      }

      // 4. Enable selected channels
      const channelItems = selectedChannels.map((ch) => ({
        channel: ch,
        isEnabled: true,
      }));
      await fetch(`/api/proxy/clients/${client.id}/channels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: channelItems }),
      });

      // 5. Generate first post
      const goalLabel = GOALS.find((g) => g.id === goal)?.label ?? 'Growth';
      const draft = await generate.mutateAsync({
        clientId: client.id,
        kind: 'POST',
        channel: selectedChannels[0],
        guidance: `[Goal: ${goalLabel}] Create an engaging first post introducing ${name.trim()} to our audience. Make it feel authentic and personal.`,
      });

      setGeneratedDraft(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleFinish = () => {
    if (createdClientId) {
      router.push(`/clients/${createdClientId}/create`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white-100">Welcome to Squadpitch</h1>
        <p className="text-white-40">Let's set up your first workspace in under a minute.</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                i < step
                  ? 'bg-accent-green-110 text-sp-surface'
                  : i === step
                    ? 'bg-accent-green-110/20 text-accent-green-110 ring-2 ring-accent-green-110'
                    : 'bg-white-10 text-white-40'
              )}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('w-8 h-0.5', i < step ? 'bg-accent-green-110' : 'bg-white-10')} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="card p-8 space-y-6">
        {step === 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-accent-green-110" />
              <h2 className="text-lg font-bold text-white-100">Tell us about your brand</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white-60 mb-1.5">
                  Business name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Fitness"
                  className="w-full px-4 py-3 rounded-xl bg-white-5 border border-white-10 text-white-100 text-base focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 placeholder:text-white-30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white-60 mb-1.5">
                  Website <span className="text-white-30">(optional)</span>
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white-5 border border-white-10 text-white-100 text-base focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 placeholder:text-white-30"
                />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-accent-green-110" />
              <h2 className="text-lg font-bold text-white-100">What's your main goal?</h2>
            </div>
            <div className="space-y-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={cn(
                    'w-full p-4 rounded-xl text-left transition-all',
                    goal === g.id
                      ? 'bg-accent-green-110/10 ring-2 ring-accent-green-110'
                      : 'bg-white-5 border border-white-10 hover:bg-white-10'
                  )}
                >
                  <p className="text-sm font-semibold text-white-100">{g.label}</p>
                  <p className="text-xs text-white-40 mt-0.5">{g.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Share2 className="w-6 h-6 text-accent-green-110" />
              <h2 className="text-lg font-bold text-white-100">Where do you post?</h2>
            </div>
            <p className="text-sm text-white-40 mb-4">Select all platforms you use.</p>
            <div className="grid grid-cols-2 gap-3">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={cn(
                    'p-4 rounded-xl text-left transition-all',
                    selectedChannels.includes(ch.id)
                      ? 'bg-accent-green-110/10 ring-2 ring-accent-green-110'
                      : 'bg-white-5 border border-white-10 hover:bg-white-10'
                  )}
                >
                  <p className="text-sm font-semibold text-white-100">{ch.label}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-accent-green-110" />
              <h2 className="text-lg font-bold text-white-100">
                {generatedDraft ? 'Your first post is ready!' : 'Setting up your workspace...'}
              </h2>
            </div>

            {isSettingUp && (
              <div className="flex flex-col items-center py-12 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-accent-green-110" />
                <p className="text-sm text-white-40">
                  Creating workspace and generating your first post...
                </p>
              </div>
            )}

            {generatedDraft && (
              <div className="space-y-4">
                <div className="card p-5 bg-white-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-accent-green-110/20 text-accent-green-110 text-xs font-medium">
                      {selectedChannels[0]}
                    </span>
                  </div>
                  <p className="text-sm text-white-100 whitespace-pre-wrap leading-relaxed">
                    {generatedDraft.body}
                  </p>
                  {generatedDraft.hashtags && generatedDraft.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {generatedDraft.hashtags.map((tag, i) => (
                        <span key={i} className="text-xs text-accent-green-110 font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-white-30 text-center">
                  You can edit this post and generate more from your workspace.
                </p>
              </div>
            )}

            {error && <StatusBanner error={error} />}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {step > 0 && step < 3 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2.5 rounded-lg text-white-60 text-sm font-medium hover:text-white-100 hover:bg-white-5 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 2 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="px-6 py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {step === 2 && (
          <button
            onClick={() => {
              setStep(3);
              handleSetupAndGenerate();
            }}
            disabled={!canProceed()}
            className="px-6 py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wand2 className="w-4 h-4" />
            Create & Generate
          </button>
        )}

        {step === 3 && generatedDraft && (
          <button
            onClick={handleFinish}
            className="px-6 py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center gap-2 hover:bg-accent-green-120 transition-colors"
          >
            Go to workspace
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
