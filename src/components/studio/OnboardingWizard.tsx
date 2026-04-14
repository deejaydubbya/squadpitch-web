'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
  Instagram,
  Linkedin,
  Music2,
  Youtube,
  Pencil,
  Database,
  SlidersHorizontal,
  ChevronRight,
  Home,
  Car,
  Building2,
  ShoppingBag,
  Landmark,
  Shield,
  Scale,
  TrendingUp,
  Wrench,
  Dumbbell,
  UtensilsCrossed,
  Scissors,
  Mic,
  Store,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useOnboardingUploadDocuments,
  useCreateClient,
  useGenerateContent,
  useChannelConnections,
  useIndustries,
  squadpitchKeys,
  type Channel,
  type Draft,
  type OnboardingAnalyzeResult,
  type OnboardingDataItem,
  type OAuthStartResponse,
  type IndustryProfile,
  type OnboardingBrandData,
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

const INDUSTRY_ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Car,
  Building2,
  ShoppingBag,
  Landmark,
  Shield,
  Scale,
  TrendingUp,
  Wrench,
  Dumbbell,
  UtensilsCrossed,
  Scissors,
  Mic,
  Store,
  Briefcase,
};

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
  X:         { badge: 'bg-white-20 text-white-60',       bg: 'from-white-5' },
  LINKEDIN:  { badge: 'bg-blue-500/20 text-blue-400', bg: 'from-blue-500/5' },
  FACEBOOK:  { badge: 'bg-blue-600/20 text-blue-300', bg: 'from-blue-600/5' },
  YOUTUBE:   { badge: 'bg-red-500/20 text-red-400',   bg: 'from-red-500/5' },
};

const INDUSTRY_PREVIEW_CONTENT: Record<string, { title: string; snippet: string; channel: string }[]> = {
  real_estate: [
    { title: 'Just Listed in Austin', snippet: '3 Bed / 2 Bath on Maple Ave — open layout, updated kitchen, huge backyard. $425K. Open house this Saturday.', channel: 'Instagram' },
    { title: 'Neighborhood Spotlight', snippet: 'Why families are moving to Westlake Hills — top schools, walkable parks, and homes under $500K.', channel: 'Facebook' },
    { title: 'Client Success Story', snippet: '"We found our dream home in 3 weeks." See how we helped the Johnsons close on their first home.', channel: 'LinkedIn' },
  ],
  car_sales: [
    { title: 'New Arrival', snippet: '2024 Toyota RAV4 XLE — 12K miles, one owner, loaded with safety features. Starting at $28,900.', channel: 'Instagram' },
    { title: 'Featured Vehicle', snippet: 'This certified pre-owned Honda Accord won\'t last. Financing available from $299/mo.', channel: 'Facebook' },
    { title: 'Limited-Time Offer', snippet: 'Memorial Day Sale — 0% APR on all new inventory this weekend only. Schedule your test drive.', channel: 'LinkedIn' },
  ],
  property_management: [
    { title: 'Now Leasing', snippet: '2BR apartment in downtown — in-unit laundry, rooftop access, pet-friendly. $1,850/mo. Tour today.', channel: 'Instagram' },
    { title: 'Resident Spotlight', snippet: '"Best management company we\'ve worked with." See why 95% of tenants renew their lease.', channel: 'Facebook' },
    { title: 'Maintenance Tip', snippet: '5 things every tenant should check before winter — protect your unit and avoid costly repairs.', channel: 'LinkedIn' },
  ],
  ecommerce: [
    { title: 'New Arrival', snippet: 'Introducing our best-selling wireless earbuds — 40hr battery, noise canceling, under $60.', channel: 'Instagram' },
    { title: 'Customer Favorite', snippet: '"These changed my morning routine." 4.8 stars from 2,300+ reviews. Free shipping today.', channel: 'Facebook' },
    { title: 'Limited-Time Promotion', snippet: 'Flash sale: 30% off all summer essentials. Use code SUMMER30 at checkout. Ends Friday.', channel: 'LinkedIn' },
  ],
  legal: [
    { title: 'Know Your Rights', snippet: '3 things you should never say after a car accident — and what to do instead. Free consultation.', channel: 'LinkedIn' },
    { title: 'Common Legal Mistakes', snippet: 'DIY estate planning? Here are 5 mistakes that could cost your family thousands.', channel: 'Facebook' },
    { title: 'When to Contact an Attorney', snippet: 'Not sure if you have a case? Here are the signs you need legal representation.', channel: 'Instagram' },
  ],
  fitness: [
    { title: 'Workout Tip', snippet: 'The #1 mistake killing your bench press gains — and the simple fix that works immediately.', channel: 'Instagram' },
    { title: 'Client Transformation', snippet: '"Down 35 lbs in 4 months." See how Sarah transformed her health with our 12-week program.', channel: 'Facebook' },
    { title: 'Training Offer', snippet: 'New member special — first month of personal training 50% off. Limited spots available.', channel: 'LinkedIn' },
  ],
  restaurant: [
    { title: 'Today\'s Special', snippet: 'Pan-seared salmon with lemon butter, roasted vegetables, and garlic mashed potatoes. Dine-in only.', channel: 'Instagram' },
    { title: 'Weekend Brunch', snippet: 'Bottomless mimosas + our new avocado toast menu. Every Saturday & Sunday 10am-2pm.', channel: 'Facebook' },
    { title: '5-Star Review', snippet: '"Best Italian food outside of Italy." See why we\'re rated #1 on Google in the neighborhood.', channel: 'LinkedIn' },
  ],
  mortgage: [
    { title: 'Rate Update', snippet: 'Rates just dropped to 6.25% — is now the right time to refinance? Free rate check in 2 minutes.', channel: 'LinkedIn' },
    { title: 'First-Time Buyer Tip', snippet: '3 things every first-time buyer should know before applying for a mortgage. Free guide inside.', channel: 'Facebook' },
    { title: 'Client Success', snippet: '"They saved us $400/month on our mortgage." See how we help families lower their payments.', channel: 'Instagram' },
  ],
  insurance: [
    { title: 'Coverage Check', snippet: 'Is your home underinsured? 60% of homeowners are. Get a free coverage review today.', channel: 'Facebook' },
    { title: 'Savings Tip', snippet: 'Bundle home + auto and save up to 25%. Most quotes take under 5 minutes.', channel: 'LinkedIn' },
    { title: 'Storm Season Prep', snippet: 'Hurricane season starts June 1. Here\'s your 5-step checklist to protect your home and family.', channel: 'Instagram' },
  ],
  finance: [
    { title: 'Tax Tip', snippet: '3 deductions most small business owners miss — could save you $5,000+ this year.', channel: 'LinkedIn' },
    { title: 'Retirement Planning', snippet: 'Think you can\'t retire early? Here\'s the simple math that changes everything.', channel: 'Facebook' },
    { title: 'Client Win', snippet: '"They found $12K in savings I didn\'t know existed." See how we optimize finances for business owners.', channel: 'Instagram' },
  ],
  home_services: [
    { title: 'Before & After', snippet: 'This kitchen went from dated to stunning in just 3 weeks. See the full transformation.', channel: 'Instagram' },
    { title: 'Seasonal Tip', snippet: 'Spring HVAC checklist — 4 things to do now to avoid a $2,000 repair this summer.', channel: 'Facebook' },
    { title: '5-Star Review', snippet: '"On time, on budget, and the work was flawless." See why 200+ homeowners trust us.', channel: 'LinkedIn' },
  ],
  beauty: [
    { title: 'New Service', snippet: 'Introducing our keratin smoothing treatment — silky, frizz-free hair for up to 12 weeks.', channel: 'Instagram' },
    { title: 'Client Glow-Up', snippet: 'From grown-out roots to dimensional balayage — swipe to see the transformation.', channel: 'Facebook' },
    { title: 'Book Now', snippet: 'Holiday appointments are filling fast. Book your color + cut before December 15.', channel: 'LinkedIn' },
  ],
  creator: [
    { title: 'Behind the Scenes', snippet: 'Here\'s my exact workflow for shooting 30 days of content in one afternoon.', channel: 'Instagram' },
    { title: 'New Drop', snippet: 'My brand new course on growing to 10K followers is live — early bird pricing ends Friday.', channel: 'LinkedIn' },
    { title: 'Engagement Post', snippet: 'What\'s the one tool you can\'t live without? Drop it below — I\'ll share my top 5 tomorrow.', channel: 'Facebook' },
  ],
  small_business: [
    { title: 'Grand Opening', snippet: 'We\'re officially open! Stop by this weekend for 20% off everything + free samples.', channel: 'Instagram' },
    { title: 'Meet the Team', snippet: 'Meet Sarah, our lead designer. She brings 10 years of experience and a passion for detail.', channel: 'Facebook' },
    { title: 'Customer Love', snippet: '"Best local shop in town." Thank you for 100+ five-star reviews. We couldn\'t do it without you.', channel: 'LinkedIn' },
  ],
  other: [
    { title: 'What We Do', snippet: 'We help businesses grow with tailored solutions. Here\'s what makes us different.', channel: 'LinkedIn' },
    { title: 'Client Spotlight', snippet: '"They exceeded every expectation." See how we helped this client achieve their goals.', channel: 'Facebook' },
    { title: 'Behind the Scenes', snippet: 'A day in the life at our company — the people, the process, and the passion behind the work.', channel: 'Instagram' },
  ],
};

const DEFAULT_PREVIEW_CONTENT = INDUSTRY_PREVIEW_CONTENT.small_business;

const CONNECT_CHANNELS: { id: Channel; label: string; icon: typeof Instagram }[] = [
  { id: 'INSTAGRAM', label: 'Instagram', icon: Instagram },
  { id: 'LINKEDIN', label: 'LinkedIn', icon: Linkedin },
  { id: 'TIKTOK', label: 'TikTok', icon: Music2 },
  { id: 'YOUTUBE', label: 'YouTube', icon: Youtube },
];

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
  onBrandDone: (brandData: OnboardingBrandData) => void;
  onDataProgress: (items: OnboardingDataItem[], count: number) => void;
  onDataDone: (items: OnboardingDataItem[], count: number) => void;
  onError: (message: string) => void;
}

async function consumeAnalyzeStream(
  body: { input: string; inputType: string; documentTexts?: string[]; industryKey?: string },
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
            callbacks.onBrandDone({ ...data.brandData, logoUrl: data.logoUrl || undefined });
            break;
          case 'data:progress':
            callbacks.onDataProgress(data.items || [], data.count || 0);
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

  // Industry profiles
  const { data: industries = [] } = useIndustries();
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const activeProfile = industries.find((p) => p.key === selectedIndustry) ?? null;

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
  const [uploadedDocNames, setUploadedDocNames] = useState<string[]>([]);
  const [extractedDataItems, setExtractedDataItems] = useState<OnboardingDataItem[]>([]);
  const [earlyBrandData, setEarlyBrandData] = useState<OnboardingBrandData | null>(null);

  // User-modifiable options (populated from AI, changeable before profiles are saved)
  const [selectedTone, setSelectedTone] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);

  // Step 3 state — Content preview bulk actions
  const [bulkActionRunning, setBulkActionRunning] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [generatingMore, setGeneratingMore] = useState(false);

  // Track if setup is running to prevent double-click
  const setupRunning = useRef(false);
  const importedDataItemIds = useRef<string[]>([]);

  // Channel connections — for Step 2 publish flow
  const queryClient = useQueryClient();
  const connections = useChannelConnections(createdClientId ?? undefined);
  const hasConnectedChannel = (connections.data ?? []).some((c) => c.status === 'CONNECTED');
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const oauthPopupRef = useRef<Window | null>(null);

  // Listen for OAuth completion from popup
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'sp-oauth-complete' && createdClientId) {
        queryClient.invalidateQueries({ queryKey: squadpitchKeys.connections(createdClientId) });
        setShowConnectPrompt(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [createdClientId, queryClient]);

  const handleConnectChannel = useCallback(async (channel: Channel) => {
    if (!createdClientId) return;

    if (oauthPopupRef.current && !oauthPopupRef.current.closed) {
      oauthPopupRef.current.focus();
      return;
    }

    const popup = window.open('about:blank', 'sp-oauth-popup', 'width=600,height=720');
    if (!popup) return;
    oauthPopupRef.current = popup;

    try {
      const data = await apiFetch<OAuthStartResponse>(
        `workspaces/${createdClientId}/connections/${channel}/oauth/start`,
        { method: 'POST' },
      );
      if (popup.closed) { oauthPopupRef.current = null; return; }
      popup.location.href = data.authUrl;
    } catch {
      popup.close();
      oauthPopupRef.current = null;
    }
  }, [createdClientId]);

  // Mutations
  const uploadDocuments = useOnboardingUploadDocuments();
  const createClient = useCreateClient();
  const generate = useGenerateContent();

  const hasBusinessInput = input.trim().length >= 3 || description.trim().length >= 10 || files.length > 0;
  const canSubmit = !!selectedIndustry && hasBusinessInput;

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
    setUploadedDocNames([]);
    setExtractedDataItems([]);
    setEarlyBrandData(null);

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
        setUploadedDocNames(uploadResult.documents.map((d) => d.filename));
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
          industryKey: selectedIndustry ?? undefined,
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
          onBrandDone: (brandData) => {
            setEarlyBrandData(brandData);
            setStage('extracting', 'done');
            setStage('extractingData', 'active');
          },
          onDataProgress: (items) => {
            setExtractedDataItems(items);
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
      const client = await createClient.mutateAsync({
        name: brandName,
        slug,
        logoUrl: result.brandData.logoUrl || undefined,
        industryKey: selectedIndustry ?? undefined,
      });
      setCreatedClientId(client.id);

      // Save profiles using the AI-extracted data
      await saveProfiles(client.id, result);
      setStage('workspace', 'done');

      // Stage 3.5: Import data items
      if (result.dataItems && result.dataItems.length > 0) {
        setStage('importing', 'active');
        try {
          const importSourceType = inputType === 'url' ? 'URL' : 'TEXT';
          await apiFetch(`workspaces/${client.id}/data-import/confirm`, {
            method: 'POST',
            body: JSON.stringify({
              items: result.dataItems.map(({ type, title, summary, dataJson, tags, priority }) => ({
                type, title, summary, dataJson, tags, priority,
              })),
              sourceType: importSourceType,
              sourceUrl: inputType === 'url' ? normalizeUrl(input) : undefined,
            }),
          });
          setStages((prev) => ({ ...prev, importing: 'done', dataItemsImported: result!.dataItems.length }));
        } catch (importErr: unknown) {
          const msg = importErr instanceof Error ? importErr.message : String(importErr);
          console.error('[onboarding] Data import failed:', msg, '| items:', result!.dataItems.length);
          // Retry once — the first attempt may fail due to a race condition
          try {
            const importSourceType = inputType === 'url' ? 'URL' : 'TEXT';
            await apiFetch(`workspaces/${client.id}/data-import/confirm`, {
              method: 'POST',
              body: JSON.stringify({
                items: result!.dataItems.map(({ type, title, summary, dataJson, tags, priority }) => ({
                  type, title, summary, dataJson, tags, priority,
                })),
                sourceType: importSourceType,
                sourceUrl: inputType === 'url' ? normalizeUrl(input) : undefined,
              }),
            });
            setStages((prev) => ({ ...prev, importing: 'done', dataItemsImported: result!.dataItems.length }));
          } catch (retryErr) {
            console.error('[onboarding] Data import retry also failed:', retryErr instanceof Error ? retryErr.message : retryErr);
            setStages((prev) => ({ ...prev, importing: 'done', dataItemsImported: 0 }));
          }
        }
      } else {
        setStages((prev) => ({ ...prev, importing: 'skipped' }));
      }

      // Stage 4: Generate 3 posts — use imported data items when available
      setStage('generating', 'active');
      const channels = result.suggestedChannels.length > 0
        ? result.suggestedChannels
        : ['INSTAGRAM' as Channel];

      const angles = result.starterAngles ?? [];
      const defaultGuidance = `Create a specific, ready-to-publish social media post for ${brandName}. Use concrete details — real numbers, specific benefits, and direct language. Reference their ${result.brandData.industry || 'business'} expertise. No vague or generic statements.`;

      // Fetch imported data items so posts are based on real business data
      let importedItems: { id: string }[] = [];
      try {
        const itemsRes = await apiFetch<{ dataItems: { id: string }[] }>(
          `workspaces/${client.id}/business-data?limit=10`,
        );
        importedItems = itemsRes.dataItems ?? [];
        importedDataItemIds.current = importedItems.map((item) => item.id);
      } catch {
        // No data items available — fall back to guidance-only
      }

      for (let i = 0; i < 3; i++) {
        const channel = channels[i % channels.length];
        const dataItemId = importedItems[i]?.id;
        try {
          const draft = await generate.mutateAsync({
            clientId: client.id,
            kind: 'POST',
            channel,
            guidance: angles[i] || defaultGuidance,
            ...(dataItemId ? { dataItemId } : {}),
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
    await checkedFetch(`/api/proxy/workspaces/${clientId}/brand`, {
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
    await checkedFetch(`/api/proxy/workspaces/${clientId}/voice`, {
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
    await checkedFetch(`/api/proxy/workspaces/${clientId}/media`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'BRAND_ASSETS_PLUS_AI' }),
    });

    // Channel settings
    const channels = result.suggestedChannels.length > 0
      ? result.suggestedChannels
      : ['INSTAGRAM' as Channel];
    await checkedFetch(`/api/proxy/workspaces/${clientId}/channels`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: channels.map((ch) => ({ channel: ch, isEnabled: true })),
      }),
    });
  };

  const handleFinish = (onboarded = false) => {
    if (createdClientId) {
      router.push(`/workspaces/${createdClientId}${onboarded ? '?onboarded=true' : ''}`);
    } else {
      router.push('/dashboard');
    }
  };

  const handleRegenerated = (oldIndex: number, newDraft: Draft) => {
    setGeneratedDrafts((prev) => prev.map((d, i) => (i === oldIndex ? newDraft : d)));
  };

  const handleBulkApproveAndSchedule = async () => {
    if (!createdClientId) return;

    // If no channel connected, just approve all (don't try to schedule)
    if (!hasConnectedChannel) {
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
      return;
    }

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

  const handleGenerateMore = async () => {
    if (!createdClientId || !analyzeResult || generatingMore) return;
    setGeneratingMore(true);
    try {
      const channels = analyzeResult.suggestedChannels.length > 0
        ? analyzeResult.suggestedChannels
        : ['INSTAGRAM' as Channel];
      const brandName = analyzeResult.brandData.name || 'Your Brand';
      const defaultGuidance = `Create a specific, ready-to-publish social media post for ${brandName}. Use concrete details — real numbers, specific benefits, and direct language. Reference their ${analyzeResult.brandData.industry || 'business'} expertise. No vague or generic statements.`;
      const angles = analyzeResult.starterAngles ?? [];
      const idx = generatedDrafts.length;
      const channel = channels[idx % channels.length];
      const ids = importedDataItemIds.current;
      const dataItemId = ids[idx];
      const draft = await generate.mutateAsync({
        clientId: createdClientId,
        kind: 'POST',
        channel,
        guidance: angles[idx % angles.length] || defaultGuidance,
        ...(dataItemId ? { dataItemId } : {}),
      });
      setGeneratedDrafts((prev) => [...prev, draft]);
      if (draft.imageGuidance) {
        apiFetch('assets/generate', {
          method: 'POST',
          body: JSON.stringify({
            clientId: createdClientId,
            guidance: draft.imageGuidance,
            draftId: draft.id,
            channel,
          }),
        }).catch(() => {});
      }
    } catch {
      // Don't block the experience
    } finally {
      setGeneratingMore(false);
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
    const previewContent = INDUSTRY_PREVIEW_CONTENT[selectedIndustry ?? ''] ?? DEFAULT_PREVIEW_CONTENT;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-white">
            Let&apos;s build your marketing system
          </h1>
          <p className="text-lg text-white-60 max-w-lg">
            First, choose your industry. Then add a website, business details, or documents — we&apos;ll generate tailored content for your business.
          </p>
        </div>

        <div className="w-full max-w-xl space-y-6">
          {/* ── Step 1: Industry Selection (primary) ── */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">
              Choose your industry
            </p>
            {industries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {industries.map((profile) => {
                  const IconComponent = INDUSTRY_ICON_MAP[profile.ui.icon] ?? Briefcase;
                  const isSelected = selectedIndustry === profile.key;
                  return (
                    <button
                      key={profile.key}
                      type="button"
                      onClick={() => setSelectedIndustry(isSelected ? null : profile.key)}
                      className={cn(
                        'flex items-center gap-2 px-3.5 py-3 rounded-xl border transition-all text-sm font-medium text-left',
                        isSelected
                          ? 'border-accent-green-110 bg-accent-green-110/15 text-accent-green-110 ring-1 ring-accent-green-110'
                          : 'border-white-10 bg-white-5 text-white-60 hover:border-white-20 hover:text-white-80',
                      )}
                    >
                      <IconComponent className="w-4 h-4 flex-shrink-0" />
                      <span className="leading-tight">{profile.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selection feedback */}
            {selectedIndustry && activeProfile && (
              <p className="text-sm text-accent-green-110 text-center animate-in fade-in duration-200">
                Great — we&apos;ll tailor content for {activeProfile.label}
              </p>
            )}
          </div>

          {/* ── Step 2: Business Details ── */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">
              Add your business details
            </p>

            {/* Website URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white-60 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Website URL
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) handleSetup();
                }}
                placeholder={activeProfile?.onboarding.websitePlaceholder ?? 'yourwebsite.com'}
                className="w-full px-4 py-3.5 rounded-xl bg-sp-card border border-white-15 text-white text-sm focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 placeholder:text-white-30"
              />
              <p className="text-xs text-white-40">
                No website? No problem — describe your business below.
              </p>
            </div>

            {/* Business description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white-60 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                {activeProfile?.onboarding.extraContextLabel ?? 'Business description'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={activeProfile?.onboarding.extraContextPlaceholder ?? 'What does your business do? Who do you serve?'}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-sp-card border border-white-15 text-white text-sm focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 placeholder:text-white-30 resize-none"
              />
            </div>

            {/* Document upload — collapsed to reduce clutter */}
            <details className="group/upload">
              <summary className="text-xs text-white-40 cursor-pointer hover:text-white-60 transition-colors select-none flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
                <ChevronRight className="w-3 h-3 transition-transform group-open/upload:rotate-90" />
                <Upload className="w-3 h-3" />
                Upload documents instead (PDF, DOCX, TXT, CSV)
              </summary>
              <div className="mt-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFilesSelected(e.dataTransfer.files);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-dashed border-white-15 hover:border-accent-green-110/40 transition-colors cursor-pointer flex items-center gap-3"
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
                  <FileText className="w-4 h-4 text-white-40 flex-shrink-0" />
                  <p className="text-xs text-white-50">
                    Brochures, menus, listings, service sheets, brand docs
                  </p>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {files.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sp-card border border-white-15 text-sm"
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
              </div>
            </details>
          </div>

          {/* ── Primary CTA ── */}
          <button
            onClick={handleSetup}
            disabled={!canSubmit}
            className="w-full px-6 py-4 rounded-2xl bg-accent-green-110 text-sp-surface font-bold text-base flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-green"
          >
            <Sparkles className="w-5 h-5" />
            {selectedIndustry ? 'Generate My Content System' : 'Choose an industry to continue'}
          </button>

          <div className="flex items-center justify-center gap-4 text-[11px] text-white-30">
            <span>AI-powered</span>
            <span className="w-1 h-1 rounded-full bg-white-15" />
            <span>Takes about 60 seconds</span>
            <span className="w-1 h-1 rounded-full bg-white-15" />
            <span>No credit card needed</span>
          </div>
        </div>

        {/* ── Preview section — industry-specific mock content ── */}
        <div className="w-full max-w-xl space-y-3 pt-2">
          <p className="text-xs font-medium text-white-40 text-center">
            {selectedIndustry && activeProfile
              ? `We'll generate ${activeProfile.label.toLowerCase()} content like this`
              : 'We\u2019ll generate content like this for your business'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {previewContent.map((item, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-xl bg-sp-card border border-white-10 p-4 space-y-2.5 transition-all duration-300',
                  selectedIndustry ? 'opacity-60' : 'opacity-30',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-accent-green-110 uppercase tracking-wide">
                    {item.channel}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white-80 leading-snug">{item.title}</p>
                <p className="text-[11px] text-white-40 leading-relaxed line-clamp-3">{item.snippet}</p>
                <div className="flex gap-1.5 pt-1">
                  <div className="h-5 w-14 bg-accent-green-110/10 rounded-full" />
                  <div className="h-5 w-10 bg-white-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Content Preview ───────────────────────────────────────

  if (step === 2) {
    return (
      <div className="flex flex-col items-center min-h-[60vh] max-w-5xl mx-auto">
        {/* Success overlay */}
        {bulkSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-sp-surface/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="w-16 h-16 text-accent-green-110" />
              <p className="text-2xl font-bold text-white">
                {analyzeResult?.brandData.name
                  ? `${analyzeResult.brandData.name} is all set!`
                  : 'You\u2019re all set!'}
              </p>
              <p className="text-sm text-white-60">Taking you to your workspace...</p>
            </div>
          </div>
        )}

        {/* ── Level 1: Wow moment headline ── */}
        <div className="text-center space-y-3 pt-4 pb-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-green-110/15 text-accent-green-110 text-sm font-semibold animate-in fade-in duration-500">
            <CheckCircle2 className="w-4 h-4" />
            {analyzeResult?.brandData.name
              ? `Created for ${analyzeResult.brandData.name}`
              : 'Created for your business'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Your marketing system is ready
          </h2>
          <p className="text-base text-white-60 max-w-md mx-auto">
            Here&apos;s content created for your business — review, edit, or publish anytime.
          </p>
        </div>

        {/* ── Channel filter tabs ── */}
        {generatedDrafts.length > 0 && (() => {
          const draftChannels = Array.from(new Set(generatedDrafts.map((d) => d.channel)));
          return draftChannels.length > 1 ? (
            <div className="flex items-center gap-2 pt-4">
              <button
                onClick={() => setChannelFilter(null)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-medium transition-all',
                  !channelFilter
                    ? 'bg-accent-green-110/15 text-accent-green-110 ring-1 ring-accent-green-110'
                    : 'bg-white-5 text-white-50 hover:bg-white-10',
                )}
              >
                All
              </button>
              {draftChannels.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch === channelFilter ? null : ch)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-medium transition-all',
                    channelFilter === ch
                      ? 'bg-accent-green-110/15 text-accent-green-110 ring-1 ring-accent-green-110'
                      : 'bg-white-5 text-white-50 hover:bg-white-10',
                  )}
                >
                  {(ch === 'X' ? 'X' : ch.charAt(0) + ch.slice(1).toLowerCase()) + ' Preview'}
                </button>
              ))}
            </div>
          ) : null;
        })()}

        {/* ── Preview microcopy ── */}
        {generatedDrafts.length > 0 && (
          <p className="text-xs text-white-40 pt-2">
            Preview your content in different platform styles. Connect publishing channels anytime before scheduling.
          </p>
        )}

        {/* ── Weekly content plan ── */}
        {generatedDrafts.length > 0 && (() => {
          const SCHEDULE_DAYS = ['Monday', 'Wednesday', 'Friday', 'Tuesday', 'Thursday'];
          const channelLabel = (ch: string) => ch === 'X' ? 'X' : ch.charAt(0) + ch.slice(1).toLowerCase();
          return (
            <div className="w-full pt-6 pb-2 animate-in fade-in duration-500">
              <p className="text-sm font-semibold text-white-70 mb-3">Your weekly content plan</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {generatedDrafts.slice(0, 5).map((d, i) => (
                  <div key={d.id} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white-5 border border-white-10 flex-shrink-0">
                    <span className="text-xs font-semibold text-accent-green-110">{SCHEDULE_DAYS[i % SCHEDULE_DAYS.length]}</span>
                    <span className="text-white-20">·</span>
                    <span className="text-xs text-white-60">{channelLabel(d.channel)} post</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Level 2: Post cards (the hero) ── */}
        {generatedDrafts.length > 0 ? (() => {
          const CONTENT_TYPES = ['Promote', 'Educate', 'Engage'];
          const filteredDrafts = channelFilter
            ? generatedDrafts.filter((d) => d.channel === channelFilter)
            : generatedDrafts;
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full pt-4 pb-2">
              {filteredDrafts.map((draft, i) => {
                const originalIndex = generatedDrafts.indexOf(draft);
                return (
                  <div
                    key={draft.id}
                    className="animate-in fade-in slide-in-from-bottom-3 duration-300"
                    style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'backwards' }}
                  >
                    <OnboardingPostCard
                      draft={draft}
                      clientId={createdClientId!}
                      brandName={analyzeResult?.brandData.name}
                      logoUrl={analyzeResult?.brandData.logoUrl}
                      defaultScheduleTime={getScheduleTime(originalIndex)}
                      onRegenerated={(newDraft) => handleRegenerated(originalIndex, newDraft)}
                      contentType={CONTENT_TYPES[originalIndex % CONTENT_TYPES.length]}
                      isFirstPost={originalIndex === 0}
                      industryKey={selectedIndustry ?? undefined}
                      postIndex={originalIndex}
                      channelConnected={hasConnectedChannel}
                      onConnectChannel={() => setShowConnectPrompt(true)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })() : (
          <div className="p-8 rounded-2xl bg-sp-card border border-white-15 text-center w-full mt-6 space-y-3">
            <p className="text-base font-semibold text-white">
              We created starter content — customize anytime
            </p>
            <p className="text-sm text-white-60">
              Head to your dashboard to create and schedule posts.
            </p>
          </div>
        )}

        {/* Generate More Content — lazy load additional posts */}
        {generatedDrafts.length > 0 && generatedDrafts.length < 10 && (
          <button
            onClick={handleGenerateMore}
            disabled={generatingMore}
            className="mt-4 px-6 py-3 rounded-xl bg-white-5 border border-white-10 text-sm text-white-60 hover:bg-white-10 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {generatingMore ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate More Content
          </button>
        )}

        {/* ── Level 3: Primary CTA area ── */}
        {generatedDrafts.length > 0 && (
          <div className="w-full space-y-3 pt-6">
            <button
              onClick={handleBulkApproveAndSchedule}
              disabled={bulkActionRunning}
              className="w-full py-5 rounded-2xl bg-accent-green-110 text-sp-surface font-bold text-lg flex items-center justify-center gap-2.5 hover:bg-accent-green-120 transition-colors disabled:opacity-50 shadow-glow-green"
            >
              {bulkActionRunning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : hasConnectedChannel ? (
                <Calendar className="w-5 h-5" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              {hasConnectedChannel ? 'Approve & Schedule Posts' : 'Approve Posts'}
            </button>

            {hasConnectedChannel ? (
              <p className="text-center text-xs text-white-60">
                Posts will be scheduled across the next {generatedDrafts.length} days at 10:00 AM
              </p>
            ) : (
              <button
                onClick={() => setShowConnectPrompt(true)}
                className="text-center text-xs text-accent-green-110 hover:text-accent-green-120 transition-colors cursor-pointer"
              >
                Connect a channel to schedule &amp; publish
              </button>
            )}

            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                onClick={() => handleFinish()}
                disabled={bulkActionRunning}
                className="text-sm text-white-60 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Pencil className="w-3.5 h-3.5" />
                Review & Approve Posts
              </button>
              <span className="text-white-15">·</span>
              <button
                onClick={handleBulkApproveOnly}
                disabled={bulkActionRunning}
                className="text-sm text-white-60 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Approve all
              </button>
              <span className="text-white-15">·</span>
              <button
                onClick={() => setStep(0)}
                className="text-sm text-white-40 hover:text-white-60 transition-colors"
              >
                Edit business info
              </button>
            </div>
          </div>
        )}

        {bulkError && <div className="w-full pt-2"><StatusBanner error={bulkError} /></div>}

        {/* Connect prompt — shown when no channel connected and user tries to schedule */}
        {showConnectPrompt && !hasConnectedChannel && (
          <div className="w-full p-5 rounded-2xl bg-sp-card border border-accent-green-110/30 space-y-4 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-center space-y-1.5">
              <p className="text-base font-semibold text-white">
                Connect a platform to publish
              </p>
              <p className="text-sm text-white-70">
                Choose where you want to publish. You can add more later.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {CONNECT_CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => handleConnectChannel(ch.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-5 border border-white-10 hover:border-accent-green-110/50 hover:bg-white-10 transition-colors text-sm text-white"
                >
                  <ch.icon className="w-4 h-4 text-white-60" />
                  {ch.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-white-40 text-center">
              A secure popup will open to authorize your account
            </p>
          </div>
        )}

        {/* ── Level 4: Brand context (de-emphasized) ── */}
        {analyzeResult && (
          <div className="w-full pt-6 border-t border-white-15 mt-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-green-110/15 flex items-center justify-center text-xs font-bold text-accent-green-110 flex-shrink-0 overflow-hidden">
                {analyzeResult.brandData.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={analyzeResult.brandData.logoUrl} alt={analyzeResult.brandData.name} className="w-full h-full object-cover" />
                ) : (
                  analyzeResult.brandData.name?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <p className="text-sm text-white-70 flex-1 min-w-0 truncate">
                Built from <span className="text-white font-medium">{analyzeResult.brandData.name}</span>
                {analyzeResult.brandData.industry && <span> · {analyzeResult.brandData.industry}</span>}
                {analyzeResult.voiceData.tone && <span> · {analyzeResult.voiceData.tone} voice</span>}
              </p>
            </div>
          </div>
        )}

        {/* If no drafts, just show a continue button */}
        {generatedDrafts.length === 0 && (
          <button
            onClick={() => handleFinish()}
            className="px-8 py-3 rounded-2xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center gap-2 hover:bg-accent-green-120 transition-colors mt-4"
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
        <div>
          <h2 className="text-2xl font-bold text-white-100">
            {(analyzeResult?.brandData ?? earlyBrandData)
              ? `Building ${(analyzeResult?.brandData ?? earlyBrandData)!.name}\u2019s content system`
              : 'Building your content system'}
          </h2>
          <p className="text-sm text-white-60 mt-1">
            {stages.generating === 'done'
              ? 'Everything\u2019s ready \u2014 let\u2019s review your content'
              : stages.generating === 'active'
                ? 'Almost there \u2014 creating your first posts'
                : (analyzeResult?.brandData ?? earlyBrandData)
                  ? 'Setting up your workspace...'
                  : 'Analyzing your business \u2014 this takes about a minute'}
          </p>
        </div>

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
            doneLabel={
              inputDetectedAsUrl
                ? `${crawlPages.length} page${crawlPages.length !== 1 ? 's' : ''} explored`
                : 'Business analyzed'
            }
            activeHint={inputDetectedAsUrl ? `Reading pages from your site` : undefined}
          />
          <StageRow
            status={stages.extracting}
            activeLabel="Understanding your brand..."
            doneLabel="Brand captured"
            activeHint="AI is analyzing your voice, audience, and positioning"
          />
          {stages.extractingData !== 'skipped' && (() => {
            const dataStatus =
              (stages.importing === 'done' || stages.importing === 'skipped')
                ? 'done'
                : stages.extractingData === 'done' && stages.importing === 'active'
                  ? 'active'
                  : stages.extractingData;
            const importedCount = stages.dataItemsImported ?? extractedDataItems.length;
            return (
              <StageRow
                status={dataStatus}
                activeLabel="Discovering business insights..."
                doneLabel={
                  importedCount > 0
                    ? `${importedCount} insight${importedCount !== 1 ? 's' : ''} imported`
                    : 'Insights extracted'
                }
                activeHint={
                  extractedDataItems.length > 0
                    ? `${extractedDataItems.length} found so far — still searching...`
                    : 'Finding testimonials, products, and key data'
                }
              />
            );
          })()}
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

        {/* Interactive options — collapsible, de-emphasized */}
        {analyzeResult && (
          <details className="pt-2 group/customize">
            <summary className="text-xs text-white-60 cursor-pointer hover:text-white-70 transition-colors select-none flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
              <ChevronRight className="w-3 h-3 text-white-40 transition-transform group-open/customize:rotate-90" />
              <SlidersHorizontal className="w-3 h-3 text-accent-green-110" />
              Customize tone, goal & channels
            </summary>
            <div className="space-y-3 mt-3">
              {/* Tone selector — inline */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-white-60 w-16 flex-shrink-0">Tone</span>
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
                <span className="text-xs font-medium text-white-60 w-16 flex-shrink-0">Goal</span>
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
                <span className="text-xs font-medium text-white-60 w-16 flex-shrink-0">Channels</span>
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
          </details>
        )}

        {/* Live crawl feed — collapsible */}
        {crawlPages.length > 0 && (
          <details open={!crawlDone} className="group/crawl">
            <summary className="text-xs text-white-60 cursor-pointer hover:text-white-70 transition-colors select-none flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
              <ChevronRight className="w-3 h-3 text-white-40 transition-transform group-open/crawl:rotate-90" />
              <Globe className="w-3 h-3 text-accent-green-110" />
              {crawlDone ? `${crawlPages.length} pages explored` : 'Exploring pages...'}
            </summary>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 mt-2">
              {crawlPages.map((page, i) => (
                <div
                  key={page.url}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-sp-card animate-in fade-in slide-in-from-left-2 duration-200"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <Globe className="w-3 h-3 text-accent-green-110 flex-shrink-0" />
                  <span className="text-xs text-white-70 truncate flex-1">
                    {page.title || shortenUrl(page.url)}
                  </span>
                  <span className="text-[10px] text-white-50 flex-shrink-0 font-mono">
                    {page.pageNum}/{page.totalExpected}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Uploaded documents — collapsible */}
        {uploadedDocNames.length > 0 && (
          <details open className="group/docs">
            <summary className="text-xs text-white-60 cursor-pointer hover:text-white-70 transition-colors select-none flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
              <ChevronRight className="w-3 h-3 text-white-40 transition-transform group-open/docs:rotate-90" />
              <FileText className="w-3 h-3 text-accent-green-110" />
              {uploadedDocNames.length} document{uploadedDocNames.length !== 1 ? 's' : ''} analyzed
            </summary>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 mt-2">
              {uploadedDocNames.map((name, i) => (
                <div
                  key={`doc-${i}`}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-sp-card animate-in fade-in slide-in-from-left-2 duration-200"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <FileText className="w-3 h-3 text-accent-green-110 flex-shrink-0" />
                  <span className="text-xs text-white-70 truncate flex-1">{name}</span>
                  <Check className="w-3 h-3 text-accent-green-110 flex-shrink-0" />
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Business data items — collapsible */}
        {extractedDataItems.length > 0 && (
          <details open={stages.extractingData === 'active'} className="group/data">
            <summary className="text-xs text-white-60 cursor-pointer hover:text-white-70 transition-colors select-none flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
              <ChevronRight className="w-3 h-3 text-white-40 transition-transform group-open/data:rotate-90" />
              <Database className="w-3 h-3 text-accent-green-110" />
              {stages.extractingData === 'done' || stages.importing === 'done'
                ? `${extractedDataItems.length} business insight${extractedDataItems.length !== 1 ? 's' : ''} found`
                : 'Extracting business data...'}
            </summary>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 mt-2">
              {extractedDataItems.map((item, i) => (
                <div
                  key={`data-${i}`}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-sp-card animate-in fade-in slide-in-from-left-2 duration-200"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className="text-[10px] text-accent-green-110 font-medium flex-shrink-0 px-1.5 py-0.5 rounded bg-accent-green-110/10 uppercase tracking-wide">
                    {item.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-white-70 truncate flex-1">
                    {item.title}
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
            className="w-full px-6 py-4 rounded-2xl bg-accent-green-110 text-sp-surface font-semibold text-base flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors mt-4 shadow-glow-green animate-in fade-in slide-in-from-bottom-2 duration-300"
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
        <p className="text-xs font-semibold text-white-60 uppercase tracking-wider">Live preview</p>

        {/* Brand card — shows as soon as brand:done fires */}
        {(() => {
          const brand = analyzeResult?.brandData ?? earlyBrandData;
          if (brand) {
            return (
              <div className="p-5 rounded-2xl space-y-3 bg-sp-card border border-white-15 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-green-110/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {brand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-accent-green-110">
                        {brand.name?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">
                      {brand.name}
                    </h3>
                    {brand.industry && (
                      <span className="text-xs text-white-60">
                        {brand.industry}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-white-70 leading-relaxed line-clamp-3">
                  {brand.description}
                </p>
              </div>
            );
          }
          return (
            <div className="p-5 rounded-2xl space-y-3 bg-sp-card border border-white-15 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white-10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-white-10 rounded" />
                  <div className="h-3 w-24 bg-white-10/60 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-white-10 rounded" />
              <div className="h-3 w-3/4 bg-white-10/60 rounded" />
            </div>
          );
        })()}

        {/* Brand discovery highlights */}
        {analyzeResult && (
          <div className="p-4 rounded-2xl bg-sp-card border border-white-15 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs font-semibold text-white-60 uppercase tracking-wider">What we discovered</p>
            <div className="flex flex-wrap gap-2">
              {analyzeResult.voiceData.tone && (
                <span className="px-2.5 py-1 rounded-full bg-accent-green-110/15 text-accent-green-110 text-xs font-medium">
                  {analyzeResult.voiceData.tone} voice
                </span>
              )}
              {analyzeResult.brandData.audience && (
                <span className="px-2.5 py-1 rounded-full bg-white-10 text-white-70 text-xs truncate max-w-[200px]">
                  {analyzeResult.brandData.audience}
                </span>
              )}
              {selectedChannels.slice(0, 3).map((ch) => {
                const chColors = CHANNEL_COLORS[ch] || { badge: 'bg-white-10 text-white-60' };
                return (
                  <span key={ch} className={cn('px-2.5 py-1 rounded-full text-xs font-medium', chColors.badge)}>
                    {ALL_CHANNELS.find((c) => c.id === ch)?.label || ch}
                  </span>
                );
              })}
            </div>
            {extractedDataItems.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Check className="w-3.5 h-3.5 text-accent-green-110 flex-shrink-0" />
                <p className="text-xs text-white-70">
                  {extractedDataItems.length} business insight{extractedDataItems.length !== 1 ? 's' : ''} found
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generated posts — progressive reveal with skeletons */}
        <div className="flex items-center gap-2 py-2">
          <Sparkles className="w-4 h-4 text-white-50" />
          <p className="text-xs text-white-60">
            {generatedDrafts.length === 3
              ? 'All posts created'
              : stages.generating === 'active'
                ? `Creating your posts... (${generatedDrafts.length}/3)`
                : stages.generating === 'pending'
                  ? 'Your posts will appear here'
                  : `${generatedDrafts.length} post${generatedDrafts.length !== 1 ? 's' : ''} created`}
          </p>
        </div>

        {/* Real cards */}
        {generatedDrafts.map((draft, i) => {
          const colors = CHANNEL_COLORS[draft.channel] || { badge: 'bg-white-10 text-white-60', bg: 'from-white-5' };
          const brandInfo = analyzeResult?.brandData ?? earlyBrandData;
          const previewBrandName = brandInfo?.name || 'Brand';
          const previewLogoUrl = brandInfo?.logoUrl;
          const brandInitial = previewBrandName[0]?.toUpperCase() || '?';
          return (
            <div
              key={draft.id}
              className="rounded-2xl border border-white-15 overflow-hidden bg-sp-card animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-accent-green-110/20 flex items-center justify-center text-xs font-bold text-accent-green-110 flex-shrink-0 overflow-hidden">
                  {previewLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewLogoUrl} alt={previewBrandName} className="w-full h-full object-cover" />
                  ) : brandInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {previewBrandName}
                  </p>
                  <p className="text-xs text-white-60">
                    {ALL_CHANNELS.find((c) => c.id === draft.channel)?.label || draft.channel}
                  </p>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-white-15">
                <p className="text-sm text-white-90 whitespace-pre-wrap leading-relaxed line-clamp-5">
                  {draft.body}
                </p>
                {draft.hashtags && draft.hashtags.length > 0 && (
                  <p className="text-sm text-accent-green-110/80 mt-2">
                    {draft.hashtags.slice(0, 5).map(t => `#${t}`).join(' ')}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Skeleton placeholders */}
        {Array.from({ length: Math.max(0, 3 - generatedDrafts.length) }).map((_, i) => (
          <div key={`skeleton-${i}`} className="rounded-2xl border border-white-15 overflow-hidden bg-sp-card animate-pulse">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-white-10" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-28 bg-white-10 rounded" />
                <div className="h-2.5 w-16 bg-white-10/60 rounded" />
              </div>
            </div>
            <div className="px-4 py-3 space-y-2.5 border-t border-white-15">
              <div className="h-3 w-full bg-white-10 rounded" />
              <div className="h-3 w-5/6 bg-white-10 rounded" />
              <div className="h-3 w-2/3 bg-white-10 rounded" />
            </div>
          </div>
        ))}
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
            status === 'pending' && 'text-white-50'
          )}
        >
          {status === 'done' ? doneLabel : activeLabel}
        </span>
        {status === 'active' && activeHint && (
          <p className="text-xs text-white-60 mt-0.5">
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
