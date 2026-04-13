'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  Check,
  Sparkles,
  Globe,
  MessageSquare,
  Zap,
  Calendar,
  CheckCircle2,
  Upload,
  FileText,
  X,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useOnboardingUploadDocuments,
  useCreateClient,
  useGenerateContent,
  type Channel,
  type Draft,
  type OnboardingAnalyzeResult,
  type OnboardingDataItem,
} from '@/hooks/useSquadpitch';
// Note: useOnboardingAnalyze replaced by SSE stream (consumeAnalyzeStream)
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

const CHANNEL_COLORS: Record<string, { badge: string; bg: string }> = {
  INSTAGRAM: { badge: 'bg-pink-500/20 text-pink-400', bg: 'from-pink-500/5' },
  TIKTOK:    { badge: 'bg-cyan-500/20 text-cyan-400', bg: 'from-cyan-500/5' },
  X:         { badge: 'bg-white/20 text-white/60',     bg: 'from-white/5' },
  LINKEDIN:  { badge: 'bg-blue-500/20 text-blue-400', bg: 'from-blue-500/5' },
  FACEBOOK:  { badge: 'bg-blue-600/20 text-blue-300', bg: 'from-blue-600/5' },
  YOUTUBE:   { badge: 'bg-red-500/20 text-red-400',   bg: 'from-red-500/5' },
};

type SetupStage = 'uploading' | 'analyzing' | 'extracting' | 'extractingData' | 'importing' | 'workspace' | 'generating';

type StageStatus = 'pending' | 'active' | 'done';

interface StageState {
  uploading: StageStatus | 'skipped';
  analyzing: StageStatus;
  extracting: StageStatus;
  extractingData: StageStatus | 'skipped';
  importing: StageStatus | 'skipped';
  workspace: StageStatus;
  generating: StageStatus;
  postsGenerated: number;
  dataItemsImported: number;
}

interface CrawlPage {
  url: string;
  title: string;
  pageNum: number;
  totalExpected: number;
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

// ── SSE stream consumer ─────────────────────────────────────────────────

interface StreamCallbacks {
  onCrawlPage: (page: CrawlPage) => void;
  onCrawlDone: () => void;
  onBrandDone: () => void;
  onDataDone: (items: OnboardingDataItem[], count: number) => void;
  onError: (message: string) => void;
}

async function consumeAnalyzeStream(
  body: { input: string; inputType: string; documentTexts?: string[] },
  callbacks: Omit<StreamCallbacks, 'onDone'>,
): Promise<OnboardingAnalyzeResult | null> {
  const res = await fetch('/api/proxy/onboarding/analyze-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    callbacks.onError('Failed to connect to analysis service.');
    return null;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: OnboardingAnalyzeResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        switch (data.event) {
          case 'crawl:page':
            callbacks.onCrawlPage(data as CrawlPage);
            break;
          case 'crawl:discovered':
            // total expected updated via crawl:page
            break;
          case 'crawl:done':
            callbacks.onCrawlDone();
            break;
          case 'brand:done':
            callbacks.onBrandDone();
            break;
          case 'data:done':
            callbacks.onDataDone(data.items || [], data.count || 0);
            break;
          case 'done':
            finalResult = data as OnboardingAnalyzeResult;
            break;
          case 'error':
            callbacks.onError(data.message || 'Analysis failed.');
            break;
        }
      } catch {
        // skip malformed event
      }
    }
  }

  return finalResult;
}

// ── Component ───────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Step 1 state
  const [input, setInput] = useState('');
  const [description, setDescription] = useState('');
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
    extractingData: 'pending',
    importing: 'pending',
    workspace: 'pending',
    generating: 'pending',
    postsGenerated: 0,
    dataItemsImported: 0,
  });

  // Live crawl progress
  const [crawlPages, setCrawlPages] = useState<CrawlPage[]>([]);
  const [crawlDone, setCrawlDone] = useState(false);
  const [extractedDataItems, setExtractedDataItems] = useState<OnboardingDataItem[]>([]);

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
  const uploadDocuments = useOnboardingUploadDocuments();
  const createClient = useCreateClient();
  const generate = useGenerateContent();

  const canSubmit = input.trim().length >= 3 || description.trim().length >= 10 || files.length > 0;

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
    setCrawlPages([]);
    setCrawlDone(false);
    setExtractedDataItems([]);

    const hasFiles = files.length > 0;
    setStages({
      uploading: hasFiles ? 'active' : 'skipped',
      analyzing: hasFiles ? 'pending' : 'active',
      extracting: 'pending',
      extractingData: 'pending',
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

      // Append description as additional context if provided
      if (description.trim()) {
        documentTexts.push(description.trim());
      }

      // Stage 1: Stream analyze
      const inputType = inputDetectedAsUrl ? 'url' : 'text';
      const inputValue = inputType === 'url' ? normalizeUrl(input) : input.trim();

      const result = await consumeAnalyzeStream(
        {
          input: inputValue,
          inputType,
          documentTexts: documentTexts.length > 0 ? documentTexts : undefined,
        },
        {
          onCrawlPage: (page) => {
            setCrawlPages((prev) => {
              if (prev.some((p) => p.url === page.url)) return prev;
              return [...prev, page];
            });
          },
          onCrawlDone: () => {
            setCrawlDone(true);
            setStage('analyzing', 'done');
            setStage('extracting', 'active');
          },
          onBrandDone: () => {
            setStage('extracting', 'done');
            setStage('extractingData', 'active');
          },
          onDataDone: (items) => {
            setExtractedDataItems(items);
            setStage('extractingData', 'done');
          },
          onError: (message) => {
            setError(message);
          },
        }
      );

      if (!result) {
        if (!error) setError('Analysis did not complete. Please try again.');
        setupRunning.current = false;
        return;
      }

      setAnalyzeResult(result);

      // Populate interactive options from AI suggestions
      setSelectedTone(mapToneToOption(result.voiceData.tone));
      setSelectedGoal(result.suggestedGoal);
      setSelectedChannels(result.suggestedChannels);

      // Stage 3: Create workspace
      setStage('workspace', 'active');
      const brandName = result.brandData.name || input.trim().slice(0, 60);
      const slug = slugify(brandName);
      const client = await createClient.mutateAsync({ name: brandName, slug });
      setCreatedClientId(client.id);

      // Save profiles using the AI-extracted data
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
          setStages((prev) => ({ ...prev, importing: 'done', dataItemsImported: result!.dataItems.length }));
        } catch {
          // Non-fatal — mark done with 0 so onboarding continues
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

      // DON'T auto-advance — let user review results and click Continue
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
    (stages.extractingData === 'done' || stages.extractingData === 'skipped') &&
    (stages.importing === 'done' || stages.importing === 'skipped') &&
    stages.workspace === 'done' &&
    stages.generating === 'done';

  // ── Step 1: Business Input ──────────────────────────────────────────

  if (step === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-white-100">
            Create your content system
          </h1>
          <p className="text-lg text-white-40 max-w-lg">
            Drop in your website and we&apos;ll build your brand voice, content strategy, and first posts automatically.
          </p>
        </div>

        <div className="w-full max-w-xl space-y-4">
          {/* URL input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white-30">
              <Globe className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) handleSetup();
              }}
              placeholder="yourwebsite.com"
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white-5 border border-white-10 text-white-100 text-base focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 placeholder:text-white-30"
              autoFocus
            />
          </div>

          <p className="text-xs text-white-30 text-center">
            Your website alone is enough — we&apos;ll extract everything we need.
          </p>

          {/* Business description (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white-40">
              Business description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your business do? Who do you serve?"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 placeholder:text-white-30 resize-none"
            />
          </div>

          {/* Compact file upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFilesSelected(e.dataTransfer.files);
            }}
            className="w-full px-4 py-3 rounded-xl border border-dashed border-white-10 hover:border-white-20 transition-colors cursor-pointer flex items-center gap-3"
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
            <Upload className="w-4 h-4 text-white-20 flex-shrink-0" />
            <p className="text-xs text-white-30">
              Have docs? Drop files here (PDF, DOCX, TXT, CSV)
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
            className="w-full px-6 py-4 rounded-2xl bg-accent-green-110 text-sp-surface font-semibold text-base flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-green"
          >
            <Sparkles className="w-5 h-5" />
            Create My Content System
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

        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-green-110/15 text-accent-green-110 text-sm font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            {generatedDrafts.length} post{generatedDrafts.length !== 1 ? 's' : ''} ready
          </span>
          <h2 className="text-3xl font-bold text-white-100">
            Your content is ready
          </h2>
          <p className="text-sm text-white-40">
            We created these posts based on your business. Review, edit, or schedule them.
          </p>
        </div>

        {/* Post cards grid */}
        {generatedDrafts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
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
          <div className="w-full space-y-4 border-t border-white-10 pt-4">
            {/* Primary CTA — full width */}
            <button
              onClick={handleBulkApproveAndSchedule}
              disabled={bulkActionRunning}
              className="w-full py-4 rounded-2xl bg-accent-green-110 text-sp-surface font-semibold text-base flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 shadow-glow-green"
            >
              {bulkActionRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              Approve & Schedule All
            </button>

            {/* Schedule info */}
            <div className="flex items-center justify-center gap-2 text-xs text-white-30">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Posts will be scheduled across the next {generatedDrafts.length} days at 10:00 AM
              </span>
            </div>

            {/* Secondary actions — text links */}
            <div className="flex items-center justify-center gap-3 text-sm">
              <button
                onClick={handleBulkApproveOnly}
                disabled={bulkActionRunning}
                className="text-white-40 hover:text-white-60 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Just approve
              </button>
              <span className="text-white-15">|</span>
              <button
                onClick={() => handleFinish()}
                disabled={bulkActionRunning}
                className="text-white-30 hover:text-white-60 transition-colors disabled:opacity-50"
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
        <h2 className="text-2xl font-bold text-white-100">Building your content system</h2>

        {/* Stage checklist */}
        <div className="space-y-3">
          {stages.uploading !== 'skipped' && (
            <StageRow
              status={stages.uploading}
              activeLabel="Reading your documents..."
              doneLabel="Documents understood"
            />
          )}
          <StageRow
            status={stages.analyzing}
            activeLabel={inputDetectedAsUrl ? 'Exploring your website...' : 'Learning about your business...'}
            doneLabel={`${crawlPages.length} page${crawlPages.length !== 1 ? 's' : ''} explored`}
            activeHint={inputDetectedAsUrl ? `Reading pages from your site` : undefined}
          />
          <StageRow
            status={stages.extracting}
            activeLabel="Understanding your brand..."
            doneLabel="Brand captured"
            activeHint="AI is analyzing your voice, audience, and positioning"
          />
          {stages.extractingData !== 'skipped' && (
            <StageRow
              status={stages.extractingData}
              activeLabel="Discovering business insights..."
              doneLabel={
                extractedDataItems.length > 0
                  ? `${extractedDataItems.length} insight${extractedDataItems.length !== 1 ? 's' : ''} found`
                  : 'Insights extracted'
              }
              activeHint="Finding testimonials, stats, and key data"
            />
          )}
          {stages.importing !== 'skipped' && (
            <StageRow
              status={stages.importing}
              activeLabel="Saving your business insights..."
              doneLabel={`${stages.dataItemsImported} insight${stages.dataItemsImported !== 1 ? 's' : ''} imported`}
            />
          )}
          <StageRow
            status={stages.workspace}
            activeLabel="Preparing your workspace..."
            doneLabel="Workspace created"
          />
          <StageRow
            status={stages.generating}
            activeLabel="Creating your first posts..."
            doneLabel={`${stages.postsGenerated} post${stages.postsGenerated !== 1 ? 's' : ''} ready to review`}
            activeHint={stages.postsGenerated > 0 ? `${stages.postsGenerated} of 3 done` : 'Writing content tailored to your brand'}
          />
        </div>

        {error && (
          <StatusBanner error={error} />
        )}

        {/* Interactive options — appear after brand extraction (ABOVE crawl feed) */}
        {analyzeResult && (
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-semibold text-white-30 uppercase tracking-widest">Content settings</p>

            {/* Tone selector — inline */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-white-40 w-16 flex-shrink-0">Tone</span>
              <div className="flex gap-1.5">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTone(t.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
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

            {/* Goal selector — inline */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-white-40 w-16 flex-shrink-0">Goal</span>
              <div className="flex gap-1.5">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                      selectedGoal === g.id
                        ? 'bg-accent-green-110/15 text-accent-green-110 ring-1 ring-accent-green-110'
                        : 'bg-white-5 text-white-60 hover:bg-white-10'
                    )}
                  >
                    <g.icon className="w-3 h-3" />
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Channel pills — inline */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-white-40 w-16 flex-shrink-0">Channels</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-[11px] font-medium transition-all',
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

        {/* Live crawl feed — collapsible */}
        {crawlPages.length > 0 && (
          <details open={!crawlDone}>
            <summary className="text-xs text-white-30 cursor-pointer hover:text-white-40 transition-colors select-none">
              {crawlDone ? `${crawlPages.length} pages explored` : 'Exploring pages...'}
            </summary>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 mt-2">
              {crawlPages.map((page, i) => (
                <div
                  key={page.url}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-white-5/50 animate-in fade-in slide-in-from-left-2 duration-200"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <Globe className="w-3 h-3 text-accent-green-110 flex-shrink-0" />
                  <span className="text-xs text-white-30 truncate flex-1">
                    {page.title || shortenUrl(page.url)}
                  </span>
                  <span className="text-[10px] text-white-20 flex-shrink-0 font-mono">
                    {page.pageNum}/{page.totalExpected}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Continue button — appears when all stages are done */}
        {allDone && (
          <button
            onClick={() => setStep(2)}
            className="w-full px-6 py-4 rounded-2xl bg-accent-green-110 text-sp-surface font-semibold text-base flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            Review Your Posts
            <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {/* Error recovery */}
        {error && !allDone && (
          <button
            onClick={() => handleFinish()}
            className="w-full px-6 py-3 rounded-2xl bg-white-10 text-white-100 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white-15 transition-colors mt-2"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right panel — Live Preview */}
      <div className="space-y-4">
        {/* Brand card */}
        {analyzeResult ? (
          <div className="card p-5 space-y-3 bg-gradient-to-br from-accent-green-110/5 to-transparent">
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

        {/* Extracted business data items */}
        {extractedDataItems.length > 0 && (
          <div className="card p-5 space-y-3 bg-white-5/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-accent-green-110" />
              <h3 className="text-sm font-bold text-white-100">
                Business Data Found
              </h3>
              <span className="text-xs text-white-30 ml-auto">
                {extractedDataItems.length} item{extractedDataItems.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {extractedDataItems.map((item, i) => (
                <div
                  key={`${item.title}-${i}`}
                  className="flex items-start gap-2 py-2 px-3 rounded-lg bg-white-5/50 animate-in fade-in duration-200"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className="px-1.5 py-0.5 rounded bg-white-10 text-[10px] text-white-40 font-mono uppercase flex-shrink-0 mt-0.5">
                    {item.type.replace('_', ' ')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white-80 font-medium truncate">
                      {item.title}
                    </p>
                    {item.summary && (
                      <p className="text-[11px] text-white-30 line-clamp-1 mt-0.5">
                        {item.summary}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white-20">
              This data will power your content generation.
            </p>
          </div>
        )}

        {/* Generated posts — platform-styled mini cards */}
        {generatedDrafts.length > 0
          ? generatedDrafts.map((draft, i) => {
              const colors = CHANNEL_COLORS[draft.channel] || { badge: 'bg-white-10 text-white-60', bg: 'from-white/5' };
              const brandInitial = analyzeResult?.brandData.name?.[0]?.toUpperCase() || '?';
              return (
                <div
                  key={draft.id}
                  className={cn(
                    'rounded-2xl border border-white-10 overflow-hidden bg-gradient-to-b to-transparent animate-in fade-in slide-in-from-bottom-2 duration-300',
                    colors.bg
                  )}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Header bar */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white-5">
                    <div className="w-7 h-7 rounded-full bg-white-10 flex items-center justify-center text-xs font-bold text-white-60 flex-shrink-0">
                      {brandInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white-80 truncate">
                        {analyzeResult?.brandData.name || 'Brand'}
                      </p>
                      <p className="text-[10px] text-white-30">
                        {ALL_CHANNELS.find((c) => c.id === draft.channel)?.label || draft.channel}
                      </p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', colors.badge)}>
                      {draft.channel}
                    </span>
                  </div>
                  {/* Body */}
                  <div className="px-4 py-3">
                    <p className="text-sm text-white-90 whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {draft.body}
                    </p>
                    {draft.hashtags && draft.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {draft.hashtags.slice(0, 5).map((tag, j) => (
                          <span key={j} className="text-xs text-accent-green-110/70 font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          : stages.generating !== 'pending' && (
              // Skeleton post cards — match new card structure
              <>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-2xl border border-white-10 overflow-hidden animate-pulse">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white-5">
                      <div className="w-7 h-7 rounded-full bg-white-10" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-20 bg-white-10 rounded" />
                        <div className="h-2 w-14 bg-white-10 rounded" />
                      </div>
                      <div className="h-4 w-16 bg-white-10 rounded-full" />
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <div className="h-3 w-full bg-white-10 rounded" />
                      <div className="h-3 w-full bg-white-10 rounded" />
                      <div className="h-3 w-2/3 bg-white-10 rounded" />
                    </div>
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
  activeHint,
}: {
  status: StageStatus | 'skipped';
  activeLabel: string;
  doneLabel: string;
  activeHint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all mt-0.5',
          status === 'done' && 'bg-accent-green-110',
          status === 'active' && 'bg-accent-green-110/20',
          status === 'pending' && 'bg-white-10'
        )}
      >
        {status === 'done' && <Check className="w-3.5 h-3.5 text-sp-surface" />}
        {status === 'active' && <Loader2 className="w-3.5 h-3.5 text-accent-green-110 animate-spin" />}
      </div>
      <div className="min-w-0">
        <span
          className={cn(
            'text-sm transition-colors',
            status === 'done' && 'text-white-100',
            status === 'active' && 'text-white-100 font-medium',
            status === 'pending' && 'text-white-30'
          )}
        >
          {status === 'done' ? doneLabel : activeLabel}
        </span>
        {status === 'active' && activeHint && (
          <p className="text-[11px] text-white-20 mt-0.5 animate-pulse">
            {activeHint}
          </p>
        )}
      </div>
    </div>
  );
}

function mapToneToOption(tone: string): string {
  const lower = tone.toLowerCase();
  if (lower.includes('bold') || lower.includes('edgy') || lower.includes('provocative')) return 'bold';
  if (lower.includes('conversational') || lower.includes('casual') || lower.includes('friendly')) return 'conversational';
  return 'professional';
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.hostname : `${u.hostname}${u.pathname}`;
  } catch {
    return url;
  }
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
