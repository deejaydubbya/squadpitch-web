'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  Wand2,
  Check,
  Search,
  Sparkles,
  Globe,
  MessageSquare,
  Zap,
  Calendar,
  CheckCircle2,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useOnboardingAnalyze,
  useOnboardingUploadDocuments,
  useCreateClient,
  useGenerateContent,
  type Channel,
  type Draft,
  type OnboardingAnalyzeResult,
} from '@/hooks/useSquadpitch';
import { apiFetch } from '@/lib/apiFetch';
import { StatusBanner } from '@/components/common/StatusBanner';
import { OnboardingPostCard } from '@/components/studio/OnboardingPostCard';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

const ALL_CHANNELS: { id: Channel; label: string }[] = [
  { id: 'INSTAGRAM', label: 'Instagram' },
  { id: 'TIKTOK', label: 'TikTok' },
  { id: 'LINKEDIN', label: 'LinkedIn' },
  { id: 'X', label: 'X' },
  { id: 'FACEBOOK', label: 'Facebook' },
  { id: 'YOUTUBE', label: 'YouTube' },
];

const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional' },
  { id: 'conversational', label: 'Conversational' },
  { id: 'bold', label: 'Bold' },
];

const GOAL_OPTIONS = [
  { id: 'growth', label: 'Growth', icon: Sparkles },
  { id: 'engagement', label: 'Engagement', icon: MessageSquare },
  { id: 'leads', label: 'Leads', icon: Zap },
] as const;

type SetupStage = 'uploading' | 'analyzing' | 'extracting' | 'importing' | 'workspace' | 'generating';

type StageStatus = 'pending' | 'active' | 'done';

interface StageState {
  uploading: StageStatus | 'skipped';
  analyzing: StageStatus;
  extracting: StageStatus;
  importing: StageStatus | 'skipped';
  workspace: StageStatus;
  generating: StageStatus;
  postsGenerated: number;
  dataItemsImported: number;
}

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.txt,.csv';
const MAX_FILES = 5;

function isUrl(value: string): boolean {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.[a-z]{2,}/i.test(trimmed) && !trimmed.includes(' ')) return true;
  return false;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Step 1 state
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state — AI results
  const [analyzeResult, setAnalyzeResult] = useState<OnboardingAnalyzeResult | null>(null);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [generatedDrafts, setGeneratedDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<StageState>({
    uploading: 'pending',
    analyzing: 'pending',
    extracting: 'pending',
    importing: 'pending',
    workspace: 'pending',
    generating: 'pending',
    postsGenerated: 0,
    dataItemsImported: 0,
  });

  // User-modifiable options (populated from AI, changeable before profiles are saved)
  const [selectedTone, setSelectedTone] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);

  // Step 3 state — Content preview bulk actions
  const [bulkActionRunning, setBulkActionRunning] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Track if setup is running to prevent double-click
  const setupRunning = useRef(false);

  // Mutations
  const analyze = useOnboardingAnalyze();
  const uploadDocuments = useOnboardingUploadDocuments();
  const createClient = useCreateClient();
  const generate = useGenerateContent();

  const canSubmit = input.trim().length >= 3 || files.length > 0;

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected) return;
    const newFiles = Array.from(selected).slice(0, MAX_FILES - files.length);
    setFiles((prev) => [...prev, ...newFiles].slice(0, MAX_FILES));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const inputDetectedAsUrl = isUrl(input);

  const setStage = (stage: SetupStage, status: 'active' | 'done') => {
    setStages((prev) => ({ ...prev, [stage]: status }));
  };

  const toggleChannel = (ch: Channel) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleSetup = async () => {
    if (setupRunning.current) return;
    setupRunning.current = true;
    setStep(1);
    setError(null);
    setGeneratedDrafts([]);
    setAnalyzeResult(null);

    const hasFiles = files.length > 0;
    setStages({
      uploading: hasFiles ? 'active' : 'skipped',
      analyzing: hasFiles ? 'pending' : 'active',
      extracting: 'pending',
      importing: 'pending',
      workspace: 'pending',
      generating: 'pending',
      postsGenerated: 0,
      dataItemsImported: 0,
    });

    try {
      // Stage 0.5: Upload documents (if any)
      let documentTexts: string[] = [];
      if (hasFiles) {
        const uploadResult = await uploadDocuments.mutateAsync(files);
        documentTexts = uploadResult.documents.map((d) => d.text);
        setStage('uploading', 'done');
        setStage('analyzing', 'active');
      }

      // Stage 1: Analyze
      const inputType = inputDetectedAsUrl ? 'url' : 'text';
      const inputValue = inputType === 'url' ? normalizeUrl(input) : input.trim();

      const result = await analyze.mutateAsync({
        input: inputValue,
        inputType,
        documentTexts: documentTexts.length > 0 ? documentTexts : undefined,
      });
      setAnalyzeResult(result);
      setStage('analyzing', 'done');

      // Populate interactive options from AI suggestions
      setSelectedTone(mapToneToOption(result.voiceData.tone));
      setSelectedGoal(result.suggestedGoal);
      setSelectedChannels(result.suggestedChannels);

      // Stage 2: Extract (visual stage — instant)
      setStage('extracting', 'active');
      await delay(400); // brief visual pause
      setStage('extracting', 'done');

      // Stage 3: Create workspace
      setStage('workspace', 'active');
      const brandName = result.brandData.name || input.trim().slice(0, 60);
      const slug = slugify(brandName);
      const client = await createClient.mutateAsync({ name: brandName, slug });
      setCreatedClientId(client.id);

      // Save profiles using the AI-extracted data
      // (user modifications will be picked up from state at this point)
      await saveProfiles(client.id, result);
      setStage('workspace', 'done');

      // Stage 3.5: Import data items
      if (result.dataItems && result.dataItems.length > 0) {
        setStage('importing', 'active');
        try {
          await apiFetch(`clients/${client.id}/data-import/confirm`, {
            method: 'POST',
            body: JSON.stringify({
              items: result.dataItems,
              sourceType: 'URL',
            }),
          });
          setStages((prev) => ({ ...prev, importing: 'done', dataItemsImported: result.dataItems.length }));
        } catch {
          // Non-fatal — mark skipped so onboarding continues
          setStages((prev) => ({ ...prev, importing: 'done', dataItemsImported: 0 }));
        }
      } else {
        setStages((prev) => ({ ...prev, importing: 'skipped' }));
      }

      // Stage 4: Generate 3 posts
      setStage('generating', 'active');
      const channels = result.suggestedChannels.length > 0
        ? result.suggestedChannels
        : ['INSTAGRAM' as Channel];

      for (let i = 0; i < 3; i++) {
        const channel = channels[i % channels.length];
        try {
          const draft = await generate.mutateAsync({
            clientId: client.id,
            kind: 'POST',
            channel,
            guidance: `Create an engaging social media post for ${brandName}. Focus on their ${result.brandData.industry} expertise. Make it authentic and ready to publish.`,
          });
          setGeneratedDrafts((prev) => [...prev, draft]);
          setStages((prev) => ({ ...prev, postsGenerated: prev.postsGenerated + 1 }));

          // Fire-and-forget image generation so images are ready by content preview
          if (draft.imageGuidance) {
            apiFetch('assets/generate', {
              method: 'POST',
              body: JSON.stringify({
                clientId: client.id,
                guidance: draft.imageGuidance,
                draftId: draft.id,
                channel,
              }),
            }).catch(() => {}); // don't block onboarding flow
          }
        } catch {
          // Continue generating remaining posts if one fails
        }
      }
      setStage('generating', 'done');

      // Auto-advance to content preview
      await delay(800);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
      setupRunning.current = false;
    }
  };

  const saveProfiles = async (clientId: string, result: OnboardingAnalyzeResult) => {
    const checkedFetch = async (url: string, init: RequestInit) => {
      const res = await fetch(url, init);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message || `Request failed (${res.status})`);
      }
      return res;
    };

    // Brand profile
    await checkedFetch(`/api/proxy/clients/${clientId}/brand`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: result.brandData.description,
        industry: result.brandData.industry,
        audience: result.brandData.audience,
        website: result.brandData.website || null,
        offers: result.brandData.offers,
        competitors: result.brandData.competitors,
      }),
    });

    // Voice profile
    await checkedFetch(`/api/proxy/clients/${clientId}/voice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tone: result.voiceData.tone,
        voiceRulesJson: {
          do: result.voiceData.doRules,
          dont: result.voiceData.dontRules,
        },
        bannedPhrases: [],
        contentBuckets: result.voiceData.contentBuckets,
      }),
    });

    // Media profile (default — enables image generation)
    await checkedFetch(`/api/proxy/clients/${clientId}/media`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'BRAND_ASSETS_PLUS_AI' }),
    });

    // Channel settings
    const channels = result.suggestedChannels.length > 0
      ? result.suggestedChannels
      : ['INSTAGRAM' as Channel];
    await checkedFetch(`/api/proxy/clients/${clientId}/channels`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: channels.map((ch) => ({ channel: ch, isEnabled: true })),
      }),
    });
  };

  const handleFinish = (onboarded = false) => {
    if (createdClientId) {
      router.push(`/clients/${createdClientId}${onboarded ? '?onboarded=true' : ''}`);
    } else {
      router.push('/dashboard');
    }
  };

  const handleRegenerated = (oldIndex: number, newDraft: Draft) => {
    setGeneratedDrafts((prev) => prev.map((d, i) => (i === oldIndex ? newDraft : d)));
  };

  const handleBulkApproveAndSchedule = async () => {
    if (!createdClientId) return;
    setBulkActionRunning(true);
    setBulkError(null);
    try {
      for (let i = 0; i < generatedDrafts.length; i++) {
        const draft = generatedDrafts[i];
        if (draft.status !== 'APPROVED' && draft.status !== 'SCHEDULED') {
          await apiFetch(`drafts/${draft.id}/approve`, { method: 'POST' });
        }
        if (draft.status !== 'SCHEDULED') {
          const time = getScheduleTime(i);
          await apiFetch(`drafts/${draft.id}/schedule`, {
            method: 'POST',
            body: JSON.stringify({ scheduledFor: time.iso }),
          });
        }
      }
      setBulkSuccess(true);
      await delay(1500);
      handleFinish(true);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk action failed.');
      setBulkActionRunning(false);
    }
  };

  const handleBulkApproveOnly = async () => {
    if (!createdClientId) return;
    setBulkActionRunning(true);
    setBulkError(null);
    try {
      for (const draft of generatedDrafts) {
        if (draft.status !== 'APPROVED' && draft.status !== 'SCHEDULED') {
          await apiFetch(`drafts/${draft.id}/approve`, { method: 'POST' });
        }
      }
      setBulkSuccess(true);
      await delay(1500);
      handleFinish(true);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk action failed.');
      setBulkActionRunning(false);
    }
  };

  const allDone = (stages.uploading === 'done' || stages.uploading === 'skipped') &&
    stages.analyzing === 'done' &&
    stages.extracting === 'done' &&
    (stages.importing === 'done' || stages.importing === 'skipped') &&
    stages.workspace === 'done' &&
    stages.generating === 'done';

  // ── Step 1: Business Input ──────────────────────────────────────────

  if (step === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-white-100">
            Build your marketing system
          </h1>
          <p className="text-lg text-white-40 max-w-md">
            Paste your website or describe your business. AI does the rest.
          </p>
        </div>

        <div className="w-full max-w-xl space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white-30">
              {inputDetectedAsUrl ? (
                <Globe className="w-5 h-5" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) handleSetup();
              }}
              placeholder="Paste your website URL or describe your business..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white-5 border border-white-10 text-white-100 text-base focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 placeholder:text-white-30"
              autoFocus
            />
          </div>

          {inputDetectedAsUrl && (
            <p className="text-xs text-white-30 text-center">
              URL detected — we'll crawl and analyze your site
            </p>
          )}

          {/* File dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFilesSelected(e.dataTransfer.files);
            }}
            className="w-full p-4 rounded-xl border border-dashed border-white-15 hover:border-accent-green-110/50 transition-colors cursor-pointer flex flex-col items-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />
            <Upload className="w-5 h-5 text-white-30" />
            <p className="text-sm text-white-40">
              Drop files or <span className="text-accent-green-110">browse</span>
            </p>
            <p className="text-xs text-white-20">
              PDF, DOCX, TXT, CSV — up to 5 files, 20MB each
            </p>
          </div>

          {/* Attached files */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-white-40 flex-shrink-0" />
                  <span className="text-white-80 truncate max-w-[160px]">{f.name}</span>
                  <span className="text-white-30 text-xs">
                    {(f.size / 1024).toFixed(0)}KB
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="text-white-30 hover:text-white-80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSetup}
            disabled={!canSubmit}
            className="w-full px-6 py-4 rounded-2xl bg-accent-green-110 text-sp-surface font-semibold text-base flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wand2 className="w-5 h-5" />
            Build My Marketing System
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Content Preview ───────────────────────────────────────

  if (step === 2) {
    return (
      <div className="flex flex-col items-center min-h-[60vh] space-y-8 max-w-5xl mx-auto">
        {/* Success overlay */}
        {bulkSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-sp-surface/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="w-16 h-16 text-accent-green-110" />
              <p className="text-xl font-bold text-white-100">You&apos;re all set!</p>
              <p className="text-sm text-white-40">Redirecting to your workspace...</p>
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white-100">
            These were created from your business and website
          </h2>
          <p className="text-sm text-white-40">
            Edit, approve, schedule, or regenerate any post before continuing.
          </p>
        </div>

        {/* Post cards grid */}
        {generatedDrafts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {generatedDrafts.map((draft, i) => (
              <OnboardingPostCard
                key={draft.id}
                draft={draft}
                clientId={createdClientId!}
                defaultScheduleTime={getScheduleTime(i)}
                onRegenerated={(newDraft) => handleRegenerated(i, newDraft)}
              />
            ))}
          </div>
        ) : (
          <div className="card p-8 bg-white-5/50 text-center w-full">
            <p className="text-sm text-white-40">
              No posts were generated. You can create content from your dashboard.
            </p>
          </div>
        )}

        {bulkError && <StatusBanner error={bulkError} />}

        {/* Bulk actions */}
        {generatedDrafts.length > 0 && (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-white-30">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Posts will be scheduled across the next {generatedDrafts.length} days at 10:00 AM
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleBulkApproveAndSchedule}
                disabled={bulkActionRunning}
                className="px-6 py-3 rounded-2xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50"
              >
                {bulkActionRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                Approve & Schedule All
              </button>
              <button
                onClick={handleBulkApproveOnly}
                disabled={bulkActionRunning}
                className="px-6 py-3 rounded-2xl bg-white-10 text-white-100 font-semibold text-sm flex items-center gap-2 hover:bg-white-15 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Just Approve
              </button>
            </div>
            <div className="text-center">
              <button
                onClick={() => handleFinish()}
                disabled={bulkActionRunning}
                className="text-sm text-white-30 hover:text-white-60 transition-colors underline underline-offset-2"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* If no drafts, just show a continue button */}
        {generatedDrafts.length === 0 && (
          <button
            onClick={() => handleFinish()}
            className="px-6 py-3 rounded-2xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center gap-2 hover:bg-accent-green-120 transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // ── Step 2: AI Setup Screen (split layout) ──────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[60vh]">
      {/* Left panel — Progress + Options */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white-100">Setting up your workspace</h2>

        {/* Stage checklist */}
        <div className="space-y-3">
          {stages.uploading !== 'skipped' && (
            <StageRow
              status={stages.uploading}
              activeLabel="Uploading documents..."
              doneLabel="Documents parsed"
            />
          )}
          <StageRow
            status={stages.analyzing}
            activeLabel={inputDetectedAsUrl ? 'Crawling website...' : 'Analyzing your business...'}
            doneLabel="Business analyzed"
          />
          <StageRow
            status={stages.extracting}
            activeLabel="Extracting brand voice..."
            doneLabel="Brand voice extracted"
          />
          {stages.importing !== 'skipped' && (
            <StageRow
              status={stages.importing}
              activeLabel="Importing business data..."
              doneLabel={`${stages.dataItemsImported} data item${stages.dataItemsImported !== 1 ? 's' : ''} imported`}
            />
          )}
          <StageRow
            status={stages.workspace}
            activeLabel="Setting up workspace..."
            doneLabel="Workspace ready"
          />
          <StageRow
            status={stages.generating}
            activeLabel="Generating content..."
            doneLabel={`${stages.postsGenerated} post${stages.postsGenerated !== 1 ? 's' : ''} generated`}
          />
        </div>

        {error && (
          <StatusBanner error={error} />
        )}

        {/* Interactive options — appear after stage 1 */}
        {analyzeResult && (
          <div className="space-y-5 pt-2">
            <div className="h-px bg-white-10" />

            {/* Tone selector */}
            <div>
              <p className="text-sm font-medium text-white-60 mb-2">Tone</p>
              <div className="flex gap-2">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTone(t.id)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      selectedTone === t.id
                        ? 'bg-accent-green-110/15 text-accent-green-110 ring-1 ring-accent-green-110'
                        : 'bg-white-5 text-white-60 hover:bg-white-10'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal selector */}
            <div>
              <p className="text-sm font-medium text-white-60 mb-2">Goal</p>
              <div className="flex gap-2">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5',
                      selectedGoal === g.id
                        ? 'bg-accent-green-110/15 text-accent-green-110 ring-1 ring-accent-green-110'
                        : 'bg-white-5 text-white-60 hover:bg-white-10'
                    )}
                  >
                    <g.icon className="w-3.5 h-3.5" />
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Channel pills */}
            <div>
              <p className="text-sm font-medium text-white-60 mb-2">Channels</p>
              <div className="flex flex-wrap gap-2">
                {ALL_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      selectedChannels.includes(ch.id)
                        ? 'bg-accent-green-110/15 text-accent-green-110 ring-1 ring-accent-green-110'
                        : 'bg-white-5 text-white-40 hover:bg-white-10'
                    )}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error recovery — only shows if auto-advance to step 2 hasn't happened */}
        {allDone && error && (
          <button
            onClick={() => handleFinish()}
            className="w-full px-6 py-4 rounded-2xl bg-accent-green-110 text-sp-surface font-semibold text-base flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors mt-4"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Right panel — Live Preview */}
      <div className="space-y-4">
        {/* Brand card */}
        {analyzeResult ? (
          <div className="card p-5 space-y-3 bg-white-5/50">
            <h3 className="text-lg font-bold text-white-100">
              {analyzeResult.brandData.name}
            </h3>
            <div className="flex items-center gap-2">
              {analyzeResult.brandData.industry && (
                <span className="px-2 py-0.5 rounded-full bg-white-10 text-white-60 text-xs">
                  {analyzeResult.brandData.industry}
                </span>
              )}
            </div>
            {analyzeResult.brandData.audience && (
              <p className="text-sm text-white-40">
                <span className="text-white-60 font-medium">Audience:</span>{' '}
                {analyzeResult.brandData.audience}
              </p>
            )}
            <p className="text-sm text-white-40 leading-relaxed">
              {analyzeResult.brandData.description}
            </p>
          </div>
        ) : (
          // Skeleton brand card
          <div className="card p-5 space-y-3 bg-white-5/50 animate-pulse">
            <div className="h-5 w-40 bg-white-10 rounded" />
            <div className="h-3 w-24 bg-white-10 rounded" />
            <div className="h-3 w-full bg-white-10 rounded" />
            <div className="h-3 w-3/4 bg-white-10 rounded" />
          </div>
        )}

        {/* Generated posts */}
        {generatedDrafts.length > 0
          ? generatedDrafts.map((draft, i) => (
              <div
                key={draft.id}
                className="card p-4 space-y-2 bg-white-5/50 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-accent-green-110/20 text-accent-green-110 text-xs font-medium">
                    {draft.channel}
                  </span>
                </div>
                <p className="text-sm text-white-100 whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {draft.body}
                </p>
                {draft.hashtags && draft.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {draft.hashtags.slice(0, 5).map((tag, j) => (
                      <span key={j} className="text-xs text-accent-green-110 font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          : stages.generating !== 'pending' && (
              // Skeleton post cards
              <>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card p-4 space-y-2 bg-white-5/50 animate-pulse">
                    <div className="h-4 w-20 bg-white-10 rounded" />
                    <div className="h-3 w-full bg-white-10 rounded" />
                    <div className="h-3 w-full bg-white-10 rounded" />
                    <div className="h-3 w-2/3 bg-white-10 rounded" />
                  </div>
                ))}
              </>
            )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function StageRow({
  status,
  activeLabel,
  doneLabel,
}: {
  status: StageStatus | 'skipped';
  activeLabel: string;
  doneLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
          status === 'done' && 'bg-accent-green-110',
          status === 'active' && 'bg-accent-green-110/20',
          status === 'pending' && 'bg-white-10'
        )}
      >
        {status === 'done' && <Check className="w-3.5 h-3.5 text-sp-surface" />}
        {status === 'active' && <Loader2 className="w-3.5 h-3.5 text-accent-green-110 animate-spin" />}
      </div>
      <span
        className={cn(
          'text-sm transition-colors',
          status === 'done' && 'text-white-100',
          status === 'active' && 'text-white-100 font-medium',
          status === 'pending' && 'text-white-30'
        )}
      >
        {status === 'done' ? doneLabel : status === 'active' ? activeLabel : activeLabel}
      </span>
    </div>
  );
}

function mapToneToOption(tone: string): string {
  const lower = tone.toLowerCase();
  if (lower.includes('bold') || lower.includes('edgy') || lower.includes('provocative')) return 'bold';
  if (lower.includes('conversational') || lower.includes('casual') || lower.includes('friendly')) return 'conversational';
  return 'professional';
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getScheduleTime(index: number): { iso: string; label: string } {
  const date = new Date();
  date.setDate(date.getDate() + 1 + index); // tomorrow + index
  date.setHours(10, 0, 0, 0);
  const iso = date.toISOString();
  const label = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) + ' at 10:00 AM';
  return { iso, label };
}
