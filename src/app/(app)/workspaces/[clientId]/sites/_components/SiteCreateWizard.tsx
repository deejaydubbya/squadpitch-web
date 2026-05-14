'use client';

// Three-step site-page create wizard:
//   1. Pick a source type (campaign / property / content asset / idea)
//   2. Pick the specific source (or compose an idea prompt)
//   3. Pick the page goal and generate
//
// On submit we POST to /pages/from-source which generates the
// page, auto-creates a LeadForm if the generated content uses one,
// persists the SitePage as DRAFT, and returns it. We then route
// the user into the editor.
//
// The wizard intentionally keeps each step minimal — the editor
// is where polish happens. Goal here is "from intent to draft
// page in under 30 seconds."

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  Home,
  BookOpen,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Wand2,
} from 'lucide-react';
import {
  useCampaigns,
  useDataItems,
  type Campaign,
} from '@/hooks/useSquadpitch';
import {
  useGeneratePageFromSource,
  type SiteSourceType,
  type SitePageGoal,
} from '@/hooks/useSites';
import { ApiError } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';

interface SiteCreateWizardProps {
  clientId: string;
  // Deep-link seeds. When set, the wizard auto-advances past the
  // steps the caller has already chosen — e.g. clicking
  // "Create landing page" on a property card lands you on
  // step 3 (goal picker) with the property pre-selected.
  initialSourceType?: SiteSourceType | null;
  initialSourceId?: string | null;
  initialPageGoal?: SitePageGoal | null;
}

interface DataItem {
  id: string;
  title: string;
  summary?: string | null;
  type?: string | null;
}

const SOURCE_OPTIONS: {
  value: SiteSourceType;
  label: string;
  description: string;
  Icon: typeof Megaphone;
}[] = [
  {
    value: 'CAMPAIGN',
    label: 'A campaign',
    description: 'Build a landing page around an existing campaign.',
    Icon: Megaphone,
  },
  {
    value: 'PROPERTY',
    label: 'A property / listing',
    description: 'Promote a single listing with photos, key details, and a contact form.',
    Icon: Home,
  },
  {
    value: 'DATA_ITEM',
    label: 'A content asset',
    description: 'Repurpose a testimonial, FAQ, or other source asset as a page.',
    Icon: BookOpen,
  },
  {
    value: 'IDEA',
    label: 'A blank idea',
    description: 'Describe what the page should be about and we’ll draft it.',
    Icon: Sparkles,
  },
];

const GOAL_OPTIONS: { value: SitePageGoal; label: string; description: string }[] = [
  {
    value: 'LEAD_CAPTURE',
    label: 'Lead capture',
    description: 'Inline form designed to convert qualified leads.',
  },
  {
    value: 'LISTING',
    label: 'Listing / property promotion',
    description: 'Showcase a property and drive showing requests.',
  },
  {
    value: 'OFFER',
    label: 'Offer / promotion',
    description: 'Convert visitors on a time-limited offer.',
  },
  {
    value: 'EVENT',
    label: 'Event / open house',
    description: 'Drive RSVPs and registrations.',
  },
  {
    value: 'CONSULTATION',
    label: 'Consultation booking',
    description: 'Book a discovery call or strategy session.',
  },
];

export function SiteCreateWizard({
  clientId,
  initialSourceType = null,
  initialSourceId = null,
  initialPageGoal = null,
}: SiteCreateWizardProps) {
  const router = useRouter();
  const generate = useGeneratePageFromSource(clientId);

  // Determine the initial step based on which seeds were provided.
  // - sourceType + sourceId + pageGoal → step 3 (just confirm + generate)
  // - sourceType only → step 2 (let user pick the specific source)
  // - nothing → step 1 (default)
  const initialStep: 1 | 2 | 3 = initialPageGoal
    ? 3
    : initialSourceType
      ? 2
      : 1;

  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [sourceType, setSourceType] = useState<SiteSourceType | null>(
    initialSourceType,
  );
  const [sourceId, setSourceId] = useState<string | null>(initialSourceId);
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [pageGoal, setPageGoal] = useState<SitePageGoal | null>(initialPageGoal);
  const [error, setError] = useState<string | null>(null);

  function goBack() {
    if (step === 1) return;
    setError(null);
    setStep((step - 1) as 1 | 2);
  }

  function chooseSource(value: SiteSourceType) {
    setSourceType(value);
    setSourceId(null);
    setIdeaPrompt('');
    setCustomPrompt('');
    setStep(2);
  }

  function step2Continue() {
    setError(null);
    if (sourceType === 'IDEA') {
      if (!ideaPrompt.trim()) {
        setError('Describe the page you want to generate');
        return;
      }
    } else if (!sourceId) {
      setError('Pick a source to continue');
      return;
    }
    setStep(3);
  }

  async function handleGenerate() {
    setError(null);
    if (!sourceType || !pageGoal) {
      setError('Pick a goal to continue');
      return;
    }
    try {
      const input =
        sourceType === 'IDEA'
          ? {
              sourceType,
              pageGoal,
              customPrompt: ideaPrompt.trim(),
            }
          : {
              sourceType,
              sourceId: sourceId!,
              pageGoal,
              customPrompt: customPrompt.trim() || undefined,
            };
      const result = await generate.mutateAsync(input);
      router.push(`/workspaces/${clientId}/sites/pages/${result.page.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Generation failed — please try again');
      }
    }
  }

  return (
    <div className="space-y-6">
      <StepIndicator currentStep={step} />

      {step === 1 && <Step1Source onChoose={chooseSource} />}
      {step === 2 && sourceType && (
        <Step2Pick
          clientId={clientId}
          sourceType={sourceType}
          sourceId={sourceId}
          setSourceId={setSourceId}
          ideaPrompt={ideaPrompt}
          setIdeaPrompt={setIdeaPrompt}
          customPrompt={customPrompt}
          setCustomPrompt={setCustomPrompt}
        />
      )}
      {step === 3 && (
        <Step3Goal pageGoal={pageGoal} setPageGoal={setPageGoal} />
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-accent-red bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1 || generate.isPending}
          className="btn btn-ghost text-sm inline-flex items-center gap-1.5 disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {step === 1 ? (
          <span className="text-xs text-white-40">Pick a starting point to continue</span>
        ) : step === 2 ? (
          <button
            type="button"
            onClick={step2Continue}
            className="btn btn-primary text-sm inline-flex items-center gap-1.5"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending || !pageGoal}
            className="btn btn-primary text-sm inline-flex items-center gap-1.5"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate page
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Source' },
    { n: 2, label: 'Details' },
    { n: 3, label: 'Goal' },
  ];
  return (
    <div className="flex items-center gap-3">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center gap-2 text-xs font-medium',
              currentStep === s.n
                ? 'text-white-100'
                : currentStep > s.n
                  ? 'text-accent-green-110'
                  : 'text-white-40',
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold',
                currentStep === s.n
                  ? 'bg-accent-green-110 text-sp-bg'
                  : currentStep > s.n
                    ? 'bg-accent-green-110/20 text-accent-green-110'
                    : 'bg-white-10 text-white-40',
              )}
            >
              {s.n}
            </span>
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 h-px bg-white-10" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Source type ────────────────────────────────────────────────

function Step1Source({
  onChoose,
}: {
  onChoose: (s: SiteSourceType) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white-90">
          Where should we start?
        </h2>
        <p className="text-sm text-white-50 mt-0.5">
          Pick a workspace artifact to build the page around. We&apos;ll
          draft a complete page, including a contact form if appropriate.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SOURCE_OPTIONS.map(({ value, label, description, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChoose(value)}
            className="card-hover p-4 text-left flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent-green-110/15 text-accent-green-110 shrink-0">
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white-90">{label}</p>
              <p className="text-xs text-white-50 mt-1">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Pick source ────────────────────────────────────────────────

interface Step2PickProps {
  clientId: string;
  sourceType: SiteSourceType;
  sourceId: string | null;
  setSourceId: (id: string | null) => void;
  ideaPrompt: string;
  setIdeaPrompt: (s: string) => void;
  customPrompt: string;
  setCustomPrompt: (s: string) => void;
}

function Step2Pick({
  clientId,
  sourceType,
  sourceId,
  setSourceId,
  ideaPrompt,
  setIdeaPrompt,
  customPrompt,
  setCustomPrompt,
}: Step2PickProps) {
  if (sourceType === 'IDEA') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white-90">
            Describe the page
          </h2>
          <p className="text-sm text-white-50 mt-0.5">
            One paragraph is enough. Mention the audience, the offer, and the
            tone you want. We&apos;ll fill in the structure.
          </p>
        </div>
        <textarea
          className="input min-h-[160px] resize-y"
          placeholder="e.g. A landing page for first-time homebuyers in Cleveland who want a free 30-minute consultation. Warm, friendly tone, emphasize how we walk them through every step."
          value={ideaPrompt}
          onChange={(e) => setIdeaPrompt(e.target.value)}
          maxLength={4000}
          autoFocus
        />
        <p className="text-xs text-white-40 text-right">
          {ideaPrompt.length} / 4000
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white-90">
          {sourceType === 'CAMPAIGN' && 'Pick a campaign'}
          {sourceType === 'PROPERTY' && 'Pick a property'}
          {sourceType === 'DATA_ITEM' && 'Pick a content asset'}
        </h2>
        <p className="text-sm text-white-50 mt-0.5">
          We&apos;ll use this as the source material for the page.
        </p>
      </div>
      {sourceType === 'CAMPAIGN' && (
        <CampaignPicker
          clientId={clientId}
          selectedId={sourceId}
          onSelect={setSourceId}
        />
      )}
      {sourceType === 'PROPERTY' && (
        <DataItemPicker
          clientId={clientId}
          type="PROPERTY"
          selectedId={sourceId}
          onSelect={setSourceId}
        />
      )}
      {sourceType === 'DATA_ITEM' && (
        <DataItemPicker
          clientId={clientId}
          type={null}
          selectedId={sourceId}
          onSelect={setSourceId}
        />
      )}
      <div className="pt-2">
        <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
          Additional notes (optional)
        </label>
        <textarea
          className="input min-h-[80px] resize-y"
          placeholder="Anything specific you want highlighted, avoided, or tweaked from the default."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          maxLength={2000}
        />
      </div>
    </div>
  );
}

function CampaignPicker({
  clientId,
  selectedId,
  onSelect,
}: {
  clientId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data, isLoading } = useCampaigns(clientId);
  if (isLoading) return <PickerSkeleton />;
  if (!data || data.length === 0) {
    return (
      <p className="card p-6 text-sm text-white-50 text-center">
        No campaigns in this workspace yet. Pick a different source.
      </p>
    );
  }
  return (
    <div className="space-y-2 max-h-[360px] overflow-y-auto">
      {data.map((c: Campaign) => (
        <PickerRow
          key={c.id}
          selected={selectedId === c.id}
          onSelect={() => onSelect(c.id)}
          title={c.name}
          subtitle={c.campaignType}
        />
      ))}
    </div>
  );
}

function DataItemPicker({
  clientId,
  type,
  selectedId,
  onSelect,
}: {
  clientId: string;
  type: 'PROPERTY' | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data, isLoading } = useDataItems(clientId, type ? { type } : {});
  if (isLoading) return <PickerSkeleton />;
  const items = (data ?? []) as DataItem[];
  if (items.length === 0) {
    return (
      <p className="card p-6 text-sm text-white-50 text-center">
        No items found. Add some {type === 'PROPERTY' ? 'properties' : 'content assets'} in
        Data first, or pick a different source.
      </p>
    );
  }
  return (
    <div className="space-y-2 max-h-[360px] overflow-y-auto">
      {items.map((item) => (
        <PickerRow
          key={item.id}
          selected={selectedId === item.id}
          onSelect={() => onSelect(item.id)}
          title={item.title}
          subtitle={item.summary ?? item.type ?? undefined}
        />
      ))}
    </div>
  );
}

function PickerRow({
  selected,
  onSelect,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-3 rounded-xl border transition-colors',
        selected
          ? 'bg-accent-green-110/10 border-accent-green-110/50'
          : 'border-white-10 hover:bg-white-5',
      )}
    >
      <p className="text-sm font-medium text-white-90">{title}</p>
      {subtitle && (
        <p className="text-xs text-white-50 mt-0.5 truncate">{subtitle}</p>
      )}
    </button>
  );
}

function PickerSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-3 animate-pulse">
          <div className="h-3 w-2/3 rounded bg-white-10 mb-2" />
          <div className="h-2 w-1/3 rounded bg-white-10" />
        </div>
      ))}
    </div>
  );
}

// ── Step 3: Goal ───────────────────────────────────────────────────────

function Step3Goal({
  pageGoal,
  setPageGoal,
}: {
  pageGoal: SitePageGoal | null;
  setPageGoal: (g: SitePageGoal) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white-90">
          What should the page do?
        </h2>
        <p className="text-sm text-white-50 mt-0.5">
          The goal shapes the layout and the lead-form fields. You can edit
          everything after generation.
        </p>
      </div>
      <div className="space-y-2">
        {GOAL_OPTIONS.map((g) => {
          const selected = pageGoal === g.value;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => setPageGoal(g.value)}
              className={cn(
                'w-full text-left p-3 rounded-xl border transition-colors',
                selected
                  ? 'bg-accent-green-110/10 border-accent-green-110/50'
                  : 'border-white-10 hover:bg-white-5',
              )}
            >
              <p className="text-sm font-medium text-white-90">{g.label}</p>
              <p className="text-xs text-white-50 mt-0.5">{g.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
