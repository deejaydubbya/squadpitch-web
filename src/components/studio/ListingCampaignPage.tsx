'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Link2,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Instagram,
  Facebook,
  Mail,
  FileText,
  Sparkles,
  DoorOpen,
  TrendingDown,
  Trophy,
  Star,
  Upload,
  ClipboardPaste,
  ListChecks,
  Save,
  CalendarPlus,
  Wand2,
  Undo2,
  Crop,
  Eraser,
  X,
  Images,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeImageQuality,
  enhanceImageDetailed,
  type QualityLabel,
  type EnhanceApplied,
  type EnhanceImageType,
} from '@/lib/imageQuality';
import { classifyImageType } from '@/lib/imageTypeClassifier';
import {
  cleanImage,
  type OverlayRegion,
  type OverlayKind,
  type CleanupConfidence,
} from '@/lib/overlayRemoval';
import {
  useListingUrlImport,
  useGenerateListingCampaign,
  useExtractListingImage,
  useSaveCampaignDrafts,
  useRegeneratePost,
  useUploadCampaignImages,
  useDataItems,
  useRecommendations,
  useAssets,
  type ListingCampaignOutput,
  type CampaignType,
  type CampaignPost,
  type SchedulePreset,
  type ExtractedImageRegion,
  type ExtractedGalleryContainer,
  type ImageRegionLabel,
  type ImageLayoutRole,
  type ImageSource,
  type ImageSourcePass,
  type MediaAsset,
} from '@/hooks/useSquadpitch';

// ── Types ──

type Step = 'source' | 'images' | 'form' | 'campaign-setup' | 'campaign-type' | 'generating' | 'campaign-builder' | 'output';

// ── Image picker types ──

// Pipeline-based image state (spinstr113). The old model conflated cache
// with display ("dataUrl swapped around depending on active toggle"), which
// caused enhanced variants to evaporate whenever clean was toggled and the
// image to re-mount whenever a different url was chosen.
//
// New model:
//   - 4 cached variants: original, cleaned, enhanced, cleanedEnhanced
//   - 2 display toggles: cleanEnabled, enhanceEnabled
//   - displayUrl is *derived* via getDisplayUrl(c) — never stored
//
// runClean / runEnhance materialize ALL relevant variants up front (e.g.
// runEnhance always computes cleanedEnhancedUrl too if cleanedUrl exists)
// so toggling is instant and never discards prior work.
interface CandidateImage {
  id: string;
  // Variant cache — originalUrl is always set; others materialize on demand.
  originalUrl: string;
  cleanedUrl: string | null;
  enhancedUrl: string | null;          // enhance applied to original
  cleanedEnhancedUrl: string | null;   // enhance applied to cleaned
  // Pure display state — toggling these never touches the cache.
  cleanEnabled: boolean;
  enhanceEnabled: boolean;
  // In-flight flags
  cleaning: boolean;
  enhancing: boolean;
  label: ImageRegionLabel;
  description: string;
  layoutRole: ImageLayoutRole;
  photoConfidence: number;
  hasText: boolean;
  quality: 'bright' | 'dim' | 'unclear';
  bbox: { x: number; y: number; w: number; h: number };
  pixelWidth: number;
  pixelHeight: number;
  // Quality detection (spinstr97) — measured from the currently-displayed variant
  qualityScore: number;         // 0-100
  qualityLabel: QualityLabel;   // 'good' | 'fair' | 'low'
  // Hybrid-pipeline traceability (spinstr99-101)
  sourcePass?: ImageSourcePass;
  parentRegionId?: string | null;
  // Gallery-first source tag (spinstr100)
  source?: ImageSource;
  // Media type classification (spinstr105)
  mediaType?: 'property_photo' | 'floorplan' | 'map' | 'ui' | 'ad' | 'unknown';
  overlays: OverlayRegion[];     // detected overlay regions
  overlayRemoved: boolean;       // true if inpainting succeeded
  // Cleanup debug metadata (spinstr112)
  cleanupConfidence: CleanupConfidence | null;
  cleanupOverlayKinds: OverlayKind[];
  cleanupInpaintSucceeded: boolean;
  cleanupOverlayCount: { detected: number; removed: number };
  // Enhancement debug metadata (spinstr112 + spinstr113)
  enhancementApplied: EnhanceApplied | null;
  enhancementType: EnhanceImageType | null;
  enhancementSkippedReason: string | null;
}

// Derive the URL to display from current toggle state. Falls back to the
// original whenever a requested variant hasn't materialized yet, so toggles
// never break even if an async materialization is still pending.
function getDisplayUrl(c: CandidateImage): string {
  if (c.cleanEnabled && c.enhanceEnabled && c.cleanedEnhancedUrl) return c.cleanedEnhancedUrl;
  if (c.cleanEnabled && c.cleanedUrl) return c.cleanedUrl;
  if (c.enhanceEnabled && c.enhancedUrl) return c.enhancedUrl;
  if (c.enhanceEnabled && c.cleanedEnhancedUrl) return c.cleanedEnhancedUrl;
  return c.originalUrl;
}

function hasEnhanced(c: CandidateImage): boolean {
  return !!(c.enhancedUrl || c.cleanedEnhancedUrl);
}
function hasCleaned(c: CandidateImage): boolean {
  return !!c.cleanedUrl;
}

// Defaults for the spinstr112 debug metadata. Spread into newly-created
// CandidateImage literals.
const EMPTY_CLEANUP_META = {
  cleanupConfidence: null as CleanupConfidence | null,
  cleanupOverlayKinds: [] as OverlayKind[],
  cleanupInpaintSucceeded: false,
  cleanupOverlayCount: { detected: 0, removed: 0 },
  enhancementApplied: null as EnhanceApplied | null,
  enhancementType: null as EnhanceImageType | null,
  enhancementSkippedReason: null as string | null,
};

// Map server-side mediaType → client-side enhance type (spinstr113).
// When mediaType is 'unknown' or unset we return null so the caller
// knows to run classifyImageType for a second opinion.
function mapMediaTypeToEnhance(
  m: CandidateImage['mediaType'] | undefined,
): EnhanceImageType | null {
  if (!m || m === 'unknown') return null;
  if (m === 'property_photo') return 'property_photo';
  if (m === 'floorplan') return 'floorplan';
  if (m === 'map') return 'map';
  if (m === 'ui') return 'ui';
  if (m === 'ad') return 'ad';
  return null;
}

const OVERLAY_KIND_LABEL: Record<OverlayKind, string> = {
  text_label: 'text label',
  pill: 'pill',
  badge: 'badge',
  icon: 'icon',
  arrow: 'arrow',
  strip: 'strip',
  watermark: 'watermark',
};

function enhancementSummary(a: EnhanceApplied): string {
  const parts: string[] = [];
  if (a.upscaled) parts.push('upscale');
  if (a.denoised) parts.push('denoise');
  if (a.levels) parts.push('levels');
  if (a.sharpen) parts.push('sharpen');
  return parts.length > 0 ? parts.join(' + ') : 'none';
}

function cleanupSummary(c: CandidateImage): string {
  const kinds = c.cleanupOverlayKinds.map((k) => OVERLAY_KIND_LABEL[k]).join(', ') || '—';
  return [
    `Detected: ${c.cleanupOverlayCount.detected}`,
    `Removed: ${c.cleanupOverlayCount.removed}`,
    `Confidence: ${c.cleanupConfidence ?? '—'}`,
    `Kinds: ${kinds}`,
  ].join(' · ');
}

// Priority for default selection — exterior first, then kitchen, etc.
const LABEL_PRIORITY: Record<ImageRegionLabel, number> = {
  exterior: 10,
  kitchen: 9,
  living_room: 8,
  backyard: 7,
  dining_room: 6,
  bedroom: 5,
  bathroom: 4,
  other: 1,
};

const LABEL_DISPLAY: Record<ImageRegionLabel, string> = {
  exterior: 'Exterior',
  kitchen: 'Kitchen',
  living_room: 'Living Room',
  backyard: 'Backyard',
  dining_room: 'Dining Room',
  bedroom: 'Bedroom',
  bathroom: 'Bathroom',
  other: 'Other',
};

interface PropertyForm {
  address: string;
  city: string;
  state: string;
  zip: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  propertyType: string;
  description: string;
  highlights: string;
  neighborhood: string;
  cta: string;
  agentName: string;
  brokerage: string;
  campaignNotes: string;
}

const EMPTY_FORM: PropertyForm = {
  address: '',
  city: '',
  state: '',
  zip: '',
  price: '',
  beds: '',
  baths: '',
  sqft: '',
  propertyType: 'Single Family',
  description: '',
  highlights: '',
  neighborhood: '',
  cta: 'Schedule a showing today',
  agentName: '',
  brokerage: '',
  campaignNotes: '',
};

const PROPERTY_TYPES = [
  'Single Family',
  'Condo',
  'Townhouse',
  'Multi-Family',
  'Land',
  'Commercial',
  'Other',
];

interface CampaignTypeOption {
  key: CampaignType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CAMPAIGN_TYPES: CampaignTypeOption[] = [
  { key: 'just_listed', label: 'Just Listed', description: 'Fresh-to-market excitement', icon: Sparkles },
  { key: 'open_house', label: 'Open House', description: 'Drive attendance to your showing', icon: DoorOpen },
  { key: 'price_drop', label: 'Price Drop', description: 'Urgency + new value story', icon: TrendingDown },
  { key: 'just_sold', label: 'Just Sold', description: 'Celebrate + build trust', icon: Trophy },
  { key: 'listing_spotlight', label: 'Listing Spotlight', description: 'Lifestyle showcase', icon: Star },
];

// ── Campaign slot configuration ──

interface CampaignSlotConfig {
  id: string;
  label: string;
  channel: string;
  campaignDay: number;
}

const DEFAULT_CAMPAIGN_SLOTS: CampaignSlotConfig[] = [
  { id: 'slot-1', label: 'Launch Announcement', channel: 'INSTAGRAM', campaignDay: 1 },
  { id: 'slot-2', label: 'Feature Highlight', channel: 'FACEBOOK', campaignDay: 2 },
  { id: 'slot-3', label: 'Lifestyle Story', channel: 'INSTAGRAM', campaignDay: 3 },
  { id: 'slot-4', label: 'Authority / Social Proof', channel: 'LINKEDIN', campaignDay: 5 },
  { id: 'slot-5', label: 'Final Push', channel: 'FACEBOOK', campaignDay: 7 },
];

const AVAILABLE_CHANNELS = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'X', 'EMAIL'];

interface ImagePoolItem {
  id: string;
  displayUrl: string;
  label: string;
}

// ── Main Component ──

interface Props {
  clientId: string;
}

export function ListingCampaignPage({ clientId }: Props) {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>('source');
  const [form, setForm] = useState<PropertyForm>(EMPTY_FORM);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());
  const [campaignType, setCampaignType] = useState<CampaignType>('just_listed');
  const [campaign, setCampaign] = useState<ListingCampaignOutput | null>(null);
  const [dataItemId, setDataItemId] = useState<string | null>(null);
  const [genError, setGenError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [schedulePreset, setSchedulePreset] = useState<SchedulePreset>(7);

  // Centralized campaign posts — source of truth for all edits. Populated
  // when generation completes, updated by CampaignPostCard via onUpdate.
  // handleSaveDrafts reads from here, not from the original `campaign`.
  const [campaignPosts, setCampaignPosts] = useState<CampaignPost[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [campaignSlots, setCampaignSlots] = useState<CampaignSlotConfig[]>(DEFAULT_CAMPAIGN_SLOTS);

  // Screenshot state
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [extractionConfidence, setExtractionConfidence] = useState<'full' | 'partial' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image picker state
  const [candidateImages, setCandidateImages] = useState<CandidateImage[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [splitNotice, setSplitNotice] = useState<string>('');
  const [uploadedAssetIds, setUploadedAssetIds] = useState<string[]>([]);
  // Stable mapping from client-side candidate ID → uploaded asset ID.
  // Captured at upload time so it's deterministic regardless of later pool changes.
  const [candidateAssetMap, setCandidateAssetMap] = useState<Map<string, string>>(new Map());
  // Hybrid-pipeline debug panel (spinstr99/100) — opt-in via ?debug=1 or localStorage.
  const [debugMode, setDebugMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (new URLSearchParams(window.location.search).get('debug') === '1') return true;
      return window.localStorage.getItem('sp:listing-campaign:debug') === '1';
    } catch {
      return false;
    }
  });
  const [extractionMeta, setExtractionMeta] = useState<{
    didSecondPass?: boolean;
    suspicionReason?: string | null;
    containerFound?: boolean;
    extractionSource?: string;
    detectedCount?: number;
    segmentation?: {
      modelRef?: string;
      totalMasks?: number;
      afterDecode?: number;
      afterFilter?: number;
      afterDedupe?: number;
      rejectedCount?: number;
      scoredCount?: number;
      selectedCount?: number;
      tookMs?: number;
      reason?: string;
      srcW?: number;
      srcH?: number;
      candidates?: Array<{
        id: string;
        bbox: { x: number; y: number; w: number; h: number };
        score: number;
        reasons?: Record<string, number>;
        stats?: { stdev: number; entropy: number; colorRange: number; domLum: number } | null;
        selected?: boolean;
      }>;
      rejected?: Array<{
        id: string;
        bbox: { x: number; y: number; w: number; h: number };
        rejectReason: string;
        stats?: { stdev: number; entropy: number; colorRange: number; domLum: number } | null;
      }>;
    } | null;
  }>({});
  // spinstr100 — gallery-first
  const [galleryContainer, setGalleryContainer] = useState<ExtractedGalleryContainer | null>(null);
  const [heroBbox, setHeroBbox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [manualCropOpen, setManualCropOpen] = useState<boolean>(false);
  // Full-size image preview modal (spinstr112). When set, opens a modal
  // showing the selected candidate at full resolution with enhance/clean/
  // set-as-hero actions.
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  // Media library picker — let users pull ready images from their asset library
  // into the campaign as candidate images.
  const [libraryPickerOpen, setLibraryPickerOpen] = useState<boolean>(false);

  // Mutations
  const urlImport = useListingUrlImport(clientId);
  const generateCampaign = useGenerateListingCampaign(clientId);
  const extractImage = useExtractListingImage(clientId);
  const saveDrafts = useSaveCampaignDrafts(clientId);
  const uploadImages = useUploadCampaignImages(clientId);
  const regeneratePost = useRegeneratePost(clientId);

  // Existing listings for selector
  const { data: existingListings } = useDataItems(clientId, { type: 'CUSTOM', limit: 20 });

  // Campaign recommendations from shared engine
  const { data: campaignRecs } = useRecommendations(clientId, 'listing_campaign');
  const campaignSuggestions = campaignRecs?.recommendations ?? [];

  // Handle URL search params (from dashboard deep links)
  useEffect(() => {
    const listingId = searchParams.get('listingId');
    const typeParam = searchParams.get('type') as CampaignType | null;

    if (typeParam && CAMPAIGN_TYPES.some((t) => t.key === typeParam)) {
      setCampaignType(typeParam);
    }

    if (listingId && existingListings) {
      const listing = existingListings.find((item) => item.id === listingId);
      if (listing) {
        prefillFromDataItem(listing);
        setStep('form');
      }
    }
    // Only run on mount / when listings load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingListings]);

  // ── Helpers ──

  const prefillFromData = useCallback((data: Record<string, unknown>, label: string) => {
    const filled = new Set<string>();
    // The listing ingestion API returns address as a nested object
    // { street, city, state, zip } but our form stores each piece flat.
    // Lift nested address fields up alongside any already-flat values.
    const flat: Record<string, unknown> = { ...data };
    const nested = data.address;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const addr = nested as Record<string, unknown>;
      if (addr.street != null && addr.street !== '') flat.address = addr.street;
      if (addr.city != null && addr.city !== '' && flat.city == null) flat.city = addr.city;
      if (addr.state != null && addr.state !== '' && flat.state == null) flat.state = addr.state;
      if (addr.zip != null && addr.zip !== '' && flat.zip == null) flat.zip = addr.zip;
    }
    setForm((prev) => {
      const next = { ...prev };
      const map: Record<string, keyof PropertyForm> = {
        address: 'address',
        city: 'city',
        state: 'state',
        zip: 'zip',
        price: 'price',
        beds: 'beds',
        baths: 'baths',
        sqft: 'sqft',
        description: 'description',
        highlights: 'highlights',
        propertyType: 'propertyType',
        neighborhood: 'neighborhood',
        cta: 'cta',
        agentName: 'agentName',
        brokerage: 'brokerage',
      };
      for (const [src, dst] of Object.entries(map)) {
        const val = flat[src];
        if (val != null && val !== '') {
          const strVal = Array.isArray(val) ? (val as string[]).join(', ') : String(val);
          next[dst] = strVal;
          filled.add(dst);
        }
      }
      return next;
    });
    setPrefilledFields(filled);
    setSourceLabel(label);
  }, []);

  const prefillFromDataItem = useCallback((item: { id: string; title: string; dataJson?: Record<string, unknown> }) => {
    const data = item.dataJson ?? {};
    prefillFromData(data, `From listing: ${item.title}`);
    setDataItemId(item.id);
  }, [prefillFromData]);

  const handleUrlImport = useCallback(async () => {
    if (!url.trim()) return;
    setUrlError('');
    try {
      const result = await urlImport.mutateAsync({ url: url.trim() });
      const r = result as unknown as Record<string, unknown>;
      const data = (r.preview ?? r) as Record<string, unknown>;
      prefillFromData(data, 'From URL');
      setStep('form');
    } catch {
      setUrlError('Could not extract details from that URL. You can enter them manually.');
      setStep('form');
    }
  }, [url, urlImport, prefillFromData]);

  // Crop each detected region out of the source screenshot using Canvas,
  // with post-crop pixel + aspect validation. Gallery-first (spinstr100):
  // each candidate carries its `source` tag (hero | gallery_tile).
  const cropRegions = useCallback(async (
    sourceDataUrl: string,
    regions: ExtractedImageRegion[],
  ): Promise<CandidateImage[]> => {
    if (!regions.length) return [];
    const rawCrops = await new Promise<Array<{
      id: string;
      dataUrl: string;
      region: ExtractedImageRegion;
      pixelWidth: number;
      pixelHeight: number;
    }>>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const out: Array<{
          id: string;
          dataUrl: string;
          region: ExtractedImageRegion;
          pixelWidth: number;
          pixelHeight: number;
        }> = [];
        for (const r of regions) {
          try {
            const sx = Math.floor(r.bbox.x * img.width);
            const sy = Math.floor(r.bbox.y * img.height);
            const sw = Math.max(1, Math.floor(r.bbox.w * img.width));
            const sh = Math.max(1, Math.floor(r.bbox.h * img.height));

            // Post-crop pixel validation — the backend already hard-rejects
            // absurd geometry, so here we only catch obvious SAM glitches.
            // MIN_DIM is deliberately forgiving: a 130×119 gallery thumbnail
            // is perfectly usable for marketing, so don't drop it for being
            // a pixel under an arbitrary bound. (spinstr105 #2)
            const MIN_DIM = Math.max(50, Math.floor(Math.min(img.width, img.height) * 0.05));
            const aspect = sw / sh;
            const looksPhotoShaped = aspect >= 0.5 && aspect <= 2.0;
            // Allow near-threshold photo-shaped tiles with a softer floor.
            const effectiveMin = looksPhotoShaped ? Math.max(40, MIN_DIM - 15) : MIN_DIM;
            if (sw < effectiveMin || sh < effectiveMin) continue;
            if (aspect < 0.3 || aspect > 4.0) continue;

            const canvas = document.createElement('canvas');
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            out.push({ id: r.id, dataUrl, region: r, pixelWidth: sw, pixelHeight: sh });
          } catch {
            // skip broken crop
          }
        }
        resolve(out);
      };
      img.onerror = () => resolve([]);
      img.src = sourceDataUrl;
    });

    // Score quality for each crop in parallel
    const candidates: CandidateImage[] = await Promise.all(
      rawCrops.map(async (c) => {
        let qualityScore = 50;
        let qualityLabel: QualityLabel = 'fair';
        try {
          const q = await computeImageQuality(c.dataUrl);
          qualityScore = q.score;
          qualityLabel = q.label;
        } catch {
          // Quality scoring is best-effort — fall back to neutral
        }
        return {
          id: c.id,
          originalUrl: c.dataUrl,
          cleanedUrl: null,
          enhancedUrl: null,
          cleanedEnhancedUrl: null,
          cleanEnabled: false,
          enhanceEnabled: false,
          cleaning: false,
          enhancing: false,
          label: c.region.label,
          description: c.region.description,
          layoutRole: c.region.layoutRole,
          photoConfidence: c.region.photoConfidence,
          hasText: c.region.hasText,
          quality: c.region.quality,
          bbox: c.region.bbox,
          pixelWidth: c.pixelWidth,
          pixelHeight: c.pixelHeight,
          qualityScore,
          qualityLabel,
          sourcePass: c.region.sourcePass,
          parentRegionId: c.region.parentRegionId ?? null,
          source: c.region.source,
          mediaType: (c.region as unknown as { mediaType?: CandidateImage['mediaType'] })
            .mediaType ?? 'property_photo',
          overlays: [],
          overlayRemoved: false,
          ...EMPTY_CLEANUP_META,
        };
      }),
    );
    return candidates;
  }, []);

  // Screenshot handling (spinstr112) — auto-detection produced unreliable
  // crops, so we now skip SAM extraction entirely. The user pastes/uploads
  // a screenshot and is dropped directly into the manual-crop flow, where
  // they can draw their own rectangles around the photos they want.
  const handleScreenshot = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setScreenshotPreview(base64);
      setGalleryContainer(null);
      setHeroBbox(null);
      setCandidateImages([]);
      setSelectedImageIds(new Set());
      setSplitNotice('');
      setExtractionConfidence(null);
      setExtractionMeta({
        didSecondPass: false,
        suspicionReason: null,
        containerFound: false,
        extractionSource: 'manual_crop',
        detectedCount: 0,
        segmentation: null,
      });
      // Jump straight to the images step and open the manual-crop modal so
      // the user can start cropping immediately.
      setStep('images');
      setManualCropOpen(true);
      // Fire the Vision extraction in parallel to populate the property form.
      // This runs independently of the manual-crop UX — the user can keep
      // cropping while the form fields come back from the server.
      extractImage.mutate(
        { image: base64 },
        {
          onSuccess: (result) => {
            if (result.extracted && Object.keys(result.extracted).length > 0) {
              prefillFromData(result.extracted, 'From screenshot');
            }
            setExtractionConfidence(result.confidence);
          },
        },
      );
    };
    reader.readAsDataURL(file);
  }, [extractImage, prefillFromData]);

  // Document-level paste listener — divs don't get paste events without focus,
  // so we listen on the whole document while the page is mounted.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Ignore paste events from input/textarea/contenteditable targets
      const target = e.target as HTMLElement | null;
      if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )) return;

      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleScreenshot(file);
          return;
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleScreenshot]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleScreenshot(file);
    }
  }, [handleScreenshot]);

  const [pasteError, setPasteError] = useState<string>('');

  const handleClipboardRead = useCallback(async () => {
    setPasteError('');
    try {
      // Prefer the modern Clipboard API which can read images on user gesture
      if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.read) {
        setPasteError('Your browser does not support clipboard image read. Use Ctrl+V / Cmd+V instead.');
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'clipboard-image.png', { type: imageType });
          handleScreenshot(file);
          return;
        }
      }
      setPasteError('No image found in your clipboard. Copy a screenshot first.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('permission')) {
        setPasteError('Clipboard access was blocked. Allow clipboard permission or use Ctrl+V / Cmd+V.');
      } else {
        setPasteError('Could not read clipboard. Try Ctrl+V / Cmd+V instead.');
      }
    }
  }, [handleScreenshot]);

  const handleGenerate = useCallback(async () => {
    setGenError('');
    setStep('generating');

    const fullAddress = [form.address, form.city, form.state, form.zip]
      .filter(Boolean)
      .join(', ');

    // Build image context from selected candidates so posts can reference them
    const selectedCandidates = candidateImages.filter((c) => selectedImageIds.has(c.id));
    const imageContext = selectedCandidates.length > 0
      ? selectedCandidates.map((c) => ({ label: c.label, description: c.description }))
      : undefined;

    try {
      const result = await generateCampaign.mutateAsync({
        propertyData: {
          address: fullAddress,
          price: form.price,
          beds: form.beds,
          baths: form.baths,
          sqft: form.sqft,
          propertyType: form.propertyType,
          description: form.description,
          highlights: form.highlights,
          neighborhood: form.neighborhood,
          cta: form.cta,
          agentName: form.agentName,
          brokerage: form.brokerage,
          campaignNotes: form.campaignNotes,
        },
        campaignType,
        imageContext,
        // Pass configured slots so the backend generates posts matching the setup
        slots: campaignSlots.map((s) => ({
          label: s.label,
          channel: s.channel,
          campaignDay: s.campaignDay,
        })),
      });
      setCampaign(result.campaign);
      // Auto-assign images to posts based on imageHint from generation
      const rawPosts = result.campaign.posts ?? [];
      const selected = candidateImages.filter((c) => selectedImageIds.has(c.id));
      const autoAssigned = selected.length > 0
        ? rawPosts.map((post) => {
            if (post.assignedImageIds && post.assignedImageIds.length > 0) return post;
            if (!post.imageHint) return post;
            const match = selected.find((c) => c.label === post.imageHint);
            return match ? { ...post, assignedImageIds: [match.id] } : post;
          })
        : rawPosts;
      setCampaignPosts(autoAssigned);
      if (result.dataItemId) setDataItemId(result.dataItemId);
      setStep('output');
    } catch {
      setGenError('Campaign generation failed. Please try again.');
      setStep('campaign-setup');
    }
  }, [form, campaignType, campaignSlots, generateCampaign, candidateImages, selectedImageIds]);

  const handleSaveDrafts = useCallback(async (addToPlanner: boolean) => {
    if (!campaign) return;
    setSaveSuccess('');

    // Upload selected image crops to Cloudinary/MediaLibrary first (idempotent).
    // Build a stable candidateId→assetId mapping at upload time so per-post
    // assignment survives even if the pool order changes later.
    let mediaAssetIds: string[] = uploadedAssetIds;
    let assetMap = candidateAssetMap;
    const selectedCandidates = candidateImages.filter((c) => selectedImageIds.has(c.id));
    if (mediaAssetIds.length === 0 && selectedCandidates.length > 0) {
      try {
        const result = await uploadImages.mutateAsync({
          images: selectedCandidates.map((c) => ({
            dataUrl: getDisplayUrl(c),
            label: c.label,
            caption: c.description,
            isEnhanced: c.enhanceEnabled,
            qualityScore: c.qualityScore,
            qualityLabel: c.qualityLabel,
          })),
        });
        mediaAssetIds = result.assets.map((a) => a.id);
        setUploadedAssetIds(mediaAssetIds);
        // Lock the candidate→asset mapping at upload time
        const newMap = new Map<string, string>();
        selectedCandidates.forEach((c, i) => {
          if (result.assets[i]) newMap.set(c.id, result.assets[i].id);
        });
        setCandidateAssetMap(newMap);
        assetMap = newMap;
      } catch {
        // Non-fatal — continue save without images
      }
    }

    // Build campaign with current edited posts. Map candidate image IDs to
    // uploaded asset IDs using the stable map captured at upload time.
    const editedCampaign: ListingCampaignOutput = {
      campaignName: campaign.campaignName,
      posts: campaignPosts.map((p) => ({
        ...p,
        assignedImageIds: p.assignedImageIds?.length
          ? p.assignedImageIds
              .map((cid) => assetMap.get(cid))
              .filter((id): id is string => !!id)
          : undefined,
      })),
    };

    try {
      await saveDrafts.mutateAsync({
        campaign: editedCampaign,
        propertyData: { address: form.address, city: form.city, state: form.state },
        campaignType,
        dataItemId,
        schedulePreset: addToPlanner ? schedulePreset : undefined,
        addToPlanner,
        mediaAssetIds: mediaAssetIds.length > 0 ? mediaAssetIds : undefined,
      });
      const imgNote = mediaAssetIds.length > 0 ? ` with ${mediaAssetIds.length} image${mediaAssetIds.length === 1 ? '' : 's'}` : '';
      setSaveSuccess(addToPlanner
        ? `Campaign scheduled over ${schedulePreset} days${imgNote}!`
        : `Campaign saved as drafts${imgNote}!`);
    } catch {
      setSaveSuccess('Failed to save drafts. Please try again.');
    }
  }, [campaign, campaignPosts, form, campaignType, dataItemId, saveDrafts, schedulePreset, uploadedAssetIds, candidateAssetMap, candidateImages, selectedImageIds, uploadImages]);

  // Update a single post field in the centralized campaign state.
  // Called by CampaignPostCard on every edit — body, hashtags, CTA, subject, etc.
  const updatePost = useCallback((index: number, updates: Partial<CampaignPost>) => {
    setCampaignPosts((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  }, []);

  // Regenerate a single post via the backend. Keeps all other posts untouched.
  const handleRegeneratePost = useCallback(async (index: number) => {
    const post = campaignPosts[index];
    if (!post) return;

    const fullAddress = [form.address, form.city, form.state, form.zip].filter(Boolean).join(', ');
    const selectedCandidates = candidateImages.filter((c) => selectedImageIds.has(c.id));
    const imageContext = selectedCandidates.length > 0
      ? selectedCandidates.map((c) => ({ label: c.label, description: c.description }))
      : undefined;
    // Summarize sibling posts so the regenerated post stays coordinated
    const campaignSummary = campaignPosts
      .filter((_, i) => i !== index)
      .map((p) => `Day ${p.campaignDay}: ${p.label} (${p.channel}, ${p.angle})`);

    setRegeneratingIndex(index);
    try {
      const result = await regeneratePost.mutateAsync({
        propertyData: {
          address: fullAddress,
          price: form.price,
          beds: form.beds,
          baths: form.baths,
          sqft: form.sqft,
          propertyType: form.propertyType,
          description: form.description,
          highlights: form.highlights,
          neighborhood: form.neighborhood,
          cta: form.cta,
          agentName: form.agentName,
          brokerage: form.brokerage,
        },
        campaignType,
        slot: {
          channel: post.channel,
          day: post.campaignDay,
          label: post.label,
          angle: post.angle,
        },
        campaignSummary,
        imageContext,
      });
      setCampaignPosts((prev) => prev.map((p, i) => (i === index ? result.post : p)));
    } catch {
      // Non-fatal — post stays unchanged
    } finally {
      setRegeneratingIndex(null);
    }
  }, [campaignPosts, form, campaignType, regeneratePost, candidateImages, selectedImageIds]);

  const resetWizard = () => {
    setStep('source');
    setForm(EMPTY_FORM);
    setUrl('');
    setUrlError('');
    setSourceLabel('');
    setPrefilledFields(new Set());
    setCampaignType('just_listed');
    setCampaign(null);
    setCampaignPosts([]);
    setRegeneratingIndex(null);
    setCampaignSlots(DEFAULT_CAMPAIGN_SLOTS);
    setDataItemId(null);
    setGenError('');
    setSaveSuccess('');
    setScreenshotPreview(null);
    setExtractionConfidence(null);
    setSchedulePreset(7);
    setCandidateImages([]);
    setSelectedImageIds(new Set());
    setUploadedAssetIds([]);
    setCandidateAssetMap(new Map());
    setSplitNotice('');
    setGalleryContainer(null);
    setHeroBbox(null);
    setManualCropOpen(false);
  };

  const updateField = (field: keyof PropertyForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const campaignTypeLabel = CAMPAIGN_TYPES.find((t) => t.key === campaignType)?.label ?? 'Campaign';

  // ── Step 1: Choose Property Source ──

  if (step === 'source') {
    return (
      <div
        className="max-w-3xl mx-auto py-12 px-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <h1 className="text-2xl font-bold text-white-100 mb-2">Listing Campaign</h1>
        <p className="text-white-40 text-sm mb-8">
          Turn any property into a complete marketing campaign in minutes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Select Existing Listing */}
          {existingListings && existingListings.length > 0 && (
            <SourceCard
              icon={ListChecks}
              title="Select Existing Listing"
              description={`${existingListings.length} listing${existingListings.length === 1 ? '' : 's'} available`}
              onClick={() => {
                // Select the most recent listing
                const latest = existingListings[0];
                if (latest) {
                  prefillFromDataItem(latest);
                  setStep('form');
                }
              }}
            >
              <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                {existingListings.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      prefillFromDataItem(item);
                      setStep('form');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white-5 hover:bg-white-10 text-white-60 text-xs transition-colors truncate"
                  >
                    {item.title || (typeof item.dataJson?.address === 'string' ? item.dataJson.address : null) || 'Untitled listing'}
                  </button>
                ))}
              </div>
            </SourceCard>
          )}

          {/* Import from URL */}
          <SourceCard icon={Link2} title="Import from URL" description="Paste a Zillow, Realtor.com, or listing URL">
            <div className="mt-3 flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
                placeholder="Paste listing URL..."
                className="flex-1 px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
              <button
                onClick={handleUrlImport}
                disabled={urlImport.isPending || !url.trim()}
                className="px-3 py-2 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-xs hover:bg-accent-green-120 transition-colors disabled:opacity-50"
              >
                {urlImport.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Import'}
              </button>
            </div>
            {urlError && <p className="text-orange-400 text-xs mt-2">{urlError}</p>}
          </SourceCard>

          {/* Import from Screenshot */}
          <SourceCard
            icon={Upload}
            title="Import from Screenshot"
            description="Upload, paste from clipboard, or drag & drop"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleScreenshot(file);
              }}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white-10 hover:bg-white-20 text-white-80 text-xs font-medium transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClipboardRead();
                }}
                disabled={extractImage.isPending}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent-green-110 hover:bg-accent-green-120 text-sp-surface text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Paste
              </button>
            </div>
            <p className="mt-2 text-[10px] text-white-30 text-center">
              or press Ctrl+V / Cmd+V anywhere on this page
            </p>
            {pasteError && (
              <p className="mt-2 text-[10px] text-orange-400">{pasteError}</p>
            )}
            {extractImage.isPending && (
              <div className="mt-3 flex items-center gap-2 text-white-40 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                Extracting property details...
              </div>
            )}
            {screenshotPreview && !extractImage.isPending && (
              <div className="mt-3 flex items-center gap-2">
                <img src={screenshotPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-white-10" />
                {extractionConfidence && (
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    extractionConfidence === 'full' ? 'bg-green-500/20 text-green-400' : 'bg-orange-400/20 text-orange-400'
                  )}>
                    {extractionConfidence === 'full' ? 'Full extraction' : 'Partial extraction'}
                  </span>
                )}
              </div>
            )}
          </SourceCard>

          {/* Enter Manually */}
          <SourceCard
            icon={Plus}
            title="Enter Manually"
            description="Type in property details from scratch"
            onClick={() => {
              setSourceLabel('Manual entry');
              setStep('form');
            }}
          />
        </div>

        <p className="text-white-20 text-xs text-center mb-8">
          You can also paste a screenshot from your clipboard (Ctrl+V / Cmd+V)
        </p>

        {/* Campaign Recommendations from Shared Engine */}
        {campaignSuggestions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white-60 mb-3">Recommended Campaigns</h2>
            <div className="space-y-2">
              {campaignSuggestions.slice(0, 3).map((rec) => {
                const TypeIcon = CAMPAIGN_TYPES.find((t) => t.key === rec.suggestedCampaignType)?.icon ?? Sparkles;
                return (
                  <button
                    key={rec.id}
                    onClick={() => {
                      const payload = rec.actionPayload;
                      const sourceId = payload?.listingDataItemId ?? payload?.sourceId;
                      if (sourceId && existingListings) {
                        const item = existingListings.find((l) => l.id === sourceId);
                        if (item) {
                          prefillFromDataItem(item);
                        }
                      }
                      const recCampaignType = payload?.campaignType ?? rec.suggestedCampaignType;
                      if (recCampaignType && CAMPAIGN_TYPES.some((t) => t.key === recCampaignType)) {
                        setCampaignType(recCampaignType as CampaignType);
                      }
                      setStep('form');
                    }}
                    className="w-full flex items-start gap-3 p-3 rounded-xl bg-white-5 border border-white-10 hover:border-accent-green-110/40 text-left transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent-green-110/10 flex items-center justify-center shrink-0 mt-0.5">
                      <TypeIcon className="w-4 h-4 text-accent-green-110" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white-80 truncate">{rec.title}</p>
                      <p className="text-xs text-white-40 mt-0.5 line-clamp-1">{rec.description}</p>
                      {rec.reasons.length > 0 && (
                        <p className="text-xs text-accent-green-110/70 mt-1">{rec.reasons[0]}</p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 shrink-0 mt-1">
                      {rec.confidence === 'high' ? 'Recommended' : 'Suggested'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Step 1.5: Image Picker (only shown when crops were detected) ──

  if (step === 'images') {
    const selectedCount = selectedImageIds.size;
    const toggleImage = (id: string) => {
      setSelectedImageIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };
    const selectAll = () => setSelectedImageIds(new Set(candidateImages.map((c) => c.id)));
    const selectNone = () => setSelectedImageIds(new Set());

    // Enhance a candidate — runs Canvas upscale/sharpen/levels client-side.
    // Always materializes enhancedUrl (from original), plus cleanedEnhancedUrl
    // if a cleaned base is available, so toggling clean while enhance is on
    // never discards work or triggers a recomputation. Flips enhanceEnabled
    // on but leaves cleanEnabled untouched.
    const runEnhance = async (id: string) => {
      const current = candidateImages.find((c) => c.id === id);
      if (!current || current.enhancing) return;
      setCandidateImages((prev) =>
        prev.map((c) => (c.id === id ? { ...c, enhancing: true } : c)),
      );
      try {
        // Resolve image type: prefer server-side mediaType when concrete,
        // fall back to client classifier for 'unknown'/missing hints.
        let resolvedType: EnhanceImageType =
          current.enhancementType ?? mapMediaTypeToEnhance(current.mediaType) ?? 'unknown';
        if (resolvedType === 'unknown') {
          try {
            const classified = await classifyImageType(current.originalUrl);
            resolvedType = classified.type;
          } catch {
            resolvedType = 'property_photo';
          }
        }

        let enhancedUrl = current.enhancedUrl;
        let applied: EnhanceApplied | null = current.enhancementApplied;
        let skippedReason: string | null = current.enhancementSkippedReason;
        if (!enhancedUrl) {
          const r = await enhanceImageDetailed(current.originalUrl, { type: resolvedType });
          enhancedUrl = r.dataUrl;
          applied = r.applied;
          skippedReason = r.skippedReason;
        }
        let cleanedEnhancedUrl = current.cleanedEnhancedUrl;
        if (current.cleanedUrl && !cleanedEnhancedUrl) {
          const r = await enhanceImageDetailed(current.cleanedUrl, { type: resolvedType });
          cleanedEnhancedUrl = r.dataUrl;
          applied = applied ?? r.applied;
          skippedReason = skippedReason ?? r.skippedReason;
        }
        // Recompute quality score from the variant that will actually show.
        const displayed = current.cleanEnabled && cleanedEnhancedUrl
          ? cleanedEnhancedUrl
          : enhancedUrl;
        let qualityScore = current.qualityScore;
        let qualityLabel = current.qualityLabel;
        try {
          const q = await computeImageQuality(displayed);
          qualityScore = q.score;
          qualityLabel = q.label;
        } catch {}
        setCandidateImages((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  enhancedUrl,
                  cleanedEnhancedUrl,
                  enhanceEnabled: true,
                  enhancing: false,
                  qualityScore,
                  qualityLabel,
                  enhancementApplied: applied,
                  enhancementType: resolvedType,
                  enhancementSkippedReason: skippedReason,
                }
              : c,
          ),
        );
      } catch {
        setCandidateImages((prev) =>
          prev.map((c) => (c.id === id ? { ...c, enhancing: false } : c)),
        );
      }
    };

    // Clean a candidate — detects overlay labels / badges / watermarks and
    // repaints them out of the image. Never hallucinates; if nothing confident
    // is detected, leaves the image alone. Always populates cleanedUrl and,
    // if enhancement was already run, cleanedEnhancedUrl too — so toggling
    // clean off then back on never loses the enhanced stack.
    const runClean = async (id: string) => {
      const current = candidateImages.find((c) => c.id === id);
      if (!current || current.cleaning) return;
      setCandidateImages((prev) =>
        prev.map((c) => (c.id === id ? { ...c, cleaning: true } : c)),
      );
      try {
        const result = await cleanImage(current.originalUrl);
        const overlayKinds = Array.from(new Set(result.overlays.map((o) => o.kind)));
        const removedCount = result.overlays.filter((o) => o.inpainted).length;
        const overlayCount = { detected: result.overlays.length, removed: removedCount };

        // result.removed is false when detection was empty, all candidates
        // were low-confidence, or >50% of inpaints looked unreliable.
        // In all those cases we keep the original and surface why.
        if (!result.removed) {
          setCandidateImages((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    cleaning: false,
                    overlays: result.overlays,
                    overlayRemoved: false,
                    cleanupConfidence: result.confidence,
                    cleanupOverlayKinds: overlayKinds,
                    cleanupInpaintSucceeded: result.inpaintSucceeded,
                    cleanupOverlayCount: overlayCount,
                  }
                : c,
            ),
          );
          return;
        }
        let cleanedEnhancedUrl: string | null = null;
        if (current.enhancedUrl) {
          try {
            const enhanceType =
              current.enhancementType ?? mapMediaTypeToEnhance(current.mediaType) ?? 'property_photo';
            const r = await enhanceImageDetailed(result.dataUrl, { type: enhanceType });
            cleanedEnhancedUrl = r.dataUrl;
          } catch {
            cleanedEnhancedUrl = null;
          }
        }
        const displayed = current.enhanceEnabled && cleanedEnhancedUrl
          ? cleanedEnhancedUrl
          : result.dataUrl;
        let qualityScore = current.qualityScore;
        let qualityLabel = current.qualityLabel;
        try {
          const q = await computeImageQuality(displayed);
          qualityScore = q.score;
          qualityLabel = q.label;
        } catch {}
        setCandidateImages((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            return {
              ...c,
              cleaning: false,
              cleanedUrl: result.dataUrl,
              cleanedEnhancedUrl,
              cleanEnabled: true,
              qualityScore,
              qualityLabel,
              overlays: result.overlays,
              overlayRemoved: true,
              cleanupConfidence: result.confidence,
              cleanupOverlayKinds: overlayKinds,
              cleanupInpaintSucceeded: result.inpaintSucceeded,
              cleanupOverlayCount: overlayCount,
            };
          }),
        );
      } catch {
        setCandidateImages((prev) =>
          prev.map((c) => (c.id === id ? { ...c, cleaning: false } : c)),
        );
      }
    };

    // Promote a candidate to hero (spinstr112). Demotes whichever image
    // currently holds the hero slot to a gallery tile so there's always
    // exactly one hero. Only mutates layoutRole — `source` is provenance
    // (where the crop came from) and must not be overwritten on promote,
    // and `description` is a user-facing caption, not a role label.
    const setAsHero = (id: string) => {
      setCandidateImages((prev) =>
        prev.map((c) => {
          if (c.id === id) return { ...c, layoutRole: 'hero' };
          if (c.layoutRole === 'hero') return { ...c, layoutRole: 'gallery' };
          return c;
        }),
      );
      // Ensure the new hero is selected.
      setSelectedImageIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    };

    // Toggles are pure display flips — they never touch the cache. All
    // required variants are materialized by runClean / runEnhance up front,
    // so toggling is instant and enhancement is never lost.
    const toggleCleaned = (id: string) => {
      setCandidateImages((prev) =>
        prev.map((c) =>
          c.id === id && c.cleanedUrl
            ? { ...c, cleanEnabled: !c.cleanEnabled }
            : c,
        ),
      );
    };

    const toggleVariant = (id: string) => {
      setCandidateImages((prev) =>
        prev.map((c) =>
          c.id === id && hasEnhanced(c)
            ? { ...c, enhanceEnabled: !c.enhanceEnabled }
            : c,
        ),
      );
    };

    // Bulk enhance all images that are low OR fair quality. Delegates to
    // runEnhance so cache population (including cleanedEnhancedUrl) stays
    // consistent with the single-target path.
    const enhanceAllWeak = async () => {
      const targets = candidateImages.filter(
        (c) => (c.qualityLabel === 'low' || c.qualityLabel === 'fair') && !hasEnhanced(c) && !c.enhancing,
      );
      for (const t of targets) {
        await runEnhance(t.id);
      }
    };

    // Bulk overlay cleanup across every candidate that hasn't been cleaned yet.
    const cleanAllOverlays = async () => {
      const targets = candidateImages.filter((c) => !c.cleanedUrl && !c.cleaning);
      for (const t of targets) {
        await runClean(t.id);
      }
    };

    const uncleanedCount = candidateImages.filter((c) => !c.cleanedUrl).length;

    const weakCount = candidateImages.filter(
      (c) => (c.qualityLabel === 'low' || c.qualityLabel === 'fair') && !hasEnhanced(c),
    ).length;

    const QUALITY_STYLE: Record<QualityLabel, string> = {
      good: 'bg-accent-green-110 text-sp-surface',
      fair: 'bg-yellow-500/90 text-black',
      low: 'bg-red-500/90 text-white',
    };
    const QUALITY_LABEL: Record<QualityLabel, string> = {
      good: 'Good',
      fair: 'Fair',
      low: 'Low',
    };

    // Manual crop recovery (spinstr100). Users can draw their own rectangle on the
    // screenshot when automatic extraction missed a tile.
    const openManualCrop = () => {
      if (!screenshotPreview) return;
      setSplitNotice('');
      setManualCropOpen(true);
    };

    // Crop a user-drawn rectangle out of the screenshot and add it as a
    // candidate tagged source: 'manual_crop'. (spinstr100)
    const addManualCrop = async (rect: { x: number; y: number; w: number; h: number }) => {
      if (!screenshotPreview) return;
      try {
        const crop = await new Promise<{ dataUrl: string; w: number; h: number } | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const sx = Math.max(0, Math.floor(rect.x * img.width));
              const sy = Math.max(0, Math.floor(rect.y * img.height));
              const sw = Math.max(1, Math.floor(rect.w * img.width));
              const sh = Math.max(1, Math.floor(rect.h * img.height));
              if (sw < 60 || sh < 60) { resolve(null); return; }
              const canvas = document.createElement('canvas');
              canvas.width = sw;
              canvas.height = sh;
              const ctx = canvas.getContext('2d');
              if (!ctx) { resolve(null); return; }
              ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
              resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), w: sw, h: sh });
            } catch {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = screenshotPreview;
        });
        if (!crop) {
          setSplitNotice('That crop was too small. Draw a larger rectangle.');
          return;
        }
        let qualityScore = 50;
        let qualityLabel: QualityLabel = 'fair';
        try {
          const q = await computeImageQuality(crop.dataUrl);
          qualityScore = q.score;
          qualityLabel = q.label;
        } catch {
          // best-effort
        }
        const id = `manual_${Date.now()}`;
        // First crop becomes the hero; subsequent crops are gallery tiles.
        // Users can still change the hero later with the "Set as hero"
        // action on any thumbnail.
        const isFirstCrop = candidateImages.length === 0;
        const manual: CandidateImage = {
          id,
          originalUrl: crop.dataUrl,
          cleanedUrl: null,
          enhancedUrl: null,
          cleanedEnhancedUrl: null,
          cleanEnabled: false,
          enhanceEnabled: false,
          cleaning: false,
          enhancing: false,
          label: 'other',
          description: '',
          layoutRole: isFirstCrop ? 'hero' : 'gallery',
          photoConfidence: 1,
          hasText: false,
          quality: 'bright',
          bbox: rect,
          pixelWidth: crop.w,
          pixelHeight: crop.h,
          qualityScore,
          qualityLabel,
          sourcePass: 'manual',
          parentRegionId: null,
          source: isFirstCrop ? 'hero' : 'manual_crop',
          overlays: [],
          overlayRemoved: false,
          ...EMPTY_CLEANUP_META,
        };
        setCandidateImages((prev) => [...prev, manual]);
        setSelectedImageIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        // Keep the modal open so the user can keep cropping. They'll
        // explicitly close it when they're done.
      } catch {
        setSplitNotice('Couldn\u2019t add that manual crop.');
      }
    };

    // Add an image from the workspace media library as a candidate tile.
    // Fetches the remote URL as a blob and reads it as a data URL so the
    // rest of the pipeline (enhance, clean, upload) keeps working without
    // special-casing URL-hosted images.
    const addFromLibrary = async (asset: MediaAsset) => {
      if (!asset.url) return;
      try {
        const res = await fetch(asset.url, { mode: 'cors' });
        if (!res.ok) throw new Error('fetch failed');
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        let qualityScore = 50;
        let qualityLabel: QualityLabel = 'fair';
        try {
          const q = await computeImageQuality(dataUrl);
          qualityScore = q.score;
          qualityLabel = q.label;
        } catch {
          // best-effort
        }
        const id = `library_${asset.id}_${Date.now()}`;
        const isFirst = candidateImages.length === 0;
        const manual: CandidateImage = {
          id,
          originalUrl: dataUrl,
          cleanedUrl: null,
          enhancedUrl: null,
          cleanedEnhancedUrl: null,
          cleanEnabled: false,
          enhanceEnabled: false,
          cleaning: false,
          enhancing: false,
          label: 'other',
          description: asset.caption ?? asset.altText ?? '',
          layoutRole: isFirst ? 'hero' : 'gallery',
          photoConfidence: 1,
          hasText: false,
          quality: 'bright',
          bbox: { x: 0, y: 0, w: 1, h: 1 },
          pixelWidth: asset.width ?? 0,
          pixelHeight: asset.height ?? 0,
          qualityScore,
          qualityLabel,
          sourcePass: 'manual',
          parentRegionId: null,
          source: isFirst ? 'hero' : 'manual_crop',
          overlays: [],
          overlayRemoved: false,
          ...EMPTY_CLEANUP_META,
        };
        setCandidateImages((prev) => [...prev, manual]);
        setSelectedImageIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      } catch {
        setSplitNotice('Couldn\u2019t load that image from the library.');
      }
    };

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          onClick={() => setStep('source')}
          className="flex items-center gap-1 text-white-40 text-sm hover:text-white-60 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white-100">
            Detected {candidateImages.length} image{candidateImages.length === 1 ? '' : 's'}
          </h1>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {screenshotPreview && (
              <button
                onClick={openManualCrop}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white-10 text-white-80 hover:bg-white-20 transition-colors font-medium"
                title="Draw a rectangle on the screenshot to add a tile manually"
              >
                <Crop className="w-3.5 h-3.5" />
                Manual crop
              </button>
            )}
            <button
              onClick={() => setLibraryPickerOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white-10 text-white-80 hover:bg-white-20 transition-colors font-medium"
              title="Add photos from your workspace media library"
            >
              <Images className="w-3.5 h-3.5" />
              From library
            </button>
            {weakCount > 0 && (
              <button
                onClick={enhanceAllWeak}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-green-110/15 text-accent-green-110 hover:bg-accent-green-110/25 transition-colors font-medium"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Enhance {weakCount} weak
              </button>
            )}
            {uncleanedCount > 0 && (
              <button
                onClick={cleanAllOverlays}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition-colors font-medium"
                title="Detect and remove overlay labels / badges on every image"
              >
                <Eraser className="w-3.5 h-3.5" />
                Clean overlays
              </button>
            )}
            <button
              onClick={selectAll}
              className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 hover:bg-white-20 transition-colors"
            >
              Select all
            </button>
            <button
              onClick={selectNone}
              className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 hover:bg-white-20 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => {
                const next = !debugMode;
                setDebugMode(next);
                try {
                  if (next) window.localStorage.setItem('sp:listing-campaign:debug', '1');
                  else window.localStorage.removeItem('sp:listing-campaign:debug');
                } catch {}
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-colors',
                debugMode ? 'bg-amber-500/30 text-amber-100' : 'bg-white-10 text-white-40 hover:bg-white-20',
              )}
              title="Show hybrid extraction pipeline traceability"
            >
              {debugMode ? 'Debug on' : 'Debug'}
            </button>
          </div>
        </div>
        <p className="text-white-40 text-sm mb-4">
          Choose which photos to use in your campaign. Low-quality photos can be enhanced safely — sharpened and brightness-corrected, never altered in any misleading way.
        </p>
        {candidateImages.length === 0 && screenshotPreview && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm flex items-start gap-2">
            <Crop className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">We couldn&rsquo;t confidently find a media gallery.</p>
              <p className="text-yellow-200/80 text-xs mt-0.5">Use <span className="font-semibold">Manual crop</span> above to draw rectangles around the photos you want — or continue and upload images later.</p>
            </div>
          </div>
        )}
        {splitNotice && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-white-5 border border-white-10 text-white-60 text-xs">
            {splitNotice}
          </div>
        )}
        {debugMode && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-100 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold uppercase tracking-wide">Pipeline</span>
            <span>engine: <span className="font-semibold">{extractionMeta.extractionSource ?? 'replicate_sam2'}</span></span>
            <span>container: <span className="font-semibold">{extractionMeta.containerFound ? 'found' : 'none'}</span></span>
            {typeof extractionMeta.detectedCount === 'number' && (
              <span>detected: <span className="font-semibold">{extractionMeta.detectedCount}</span></span>
            )}
            {extractionMeta.segmentation && (
              <span>
                sam2 — masks <span className="font-semibold">{extractionMeta.segmentation.totalMasks ?? '?'}</span>
                {' → decoded '}<span className="font-semibold">{extractionMeta.segmentation.afterDecode ?? '?'}</span>
                {' → rejected '}<span className="font-semibold text-red-300">{extractionMeta.segmentation.rejectedCount ?? '?'}</span>
                {' → scored '}<span className="font-semibold">{extractionMeta.segmentation.scoredCount ?? '?'}</span>
                {' → deduped '}<span className="font-semibold">{extractionMeta.segmentation.afterDedupe ?? '?'}</span>
                {' → selected '}<span className="font-semibold text-green-300">{extractionMeta.segmentation.selectedCount ?? '?'}</span>
                {extractionMeta.segmentation.tookMs != null && (
                  <> ({extractionMeta.segmentation.tookMs}ms)</>
                )}
                {extractionMeta.segmentation.reason && (
                  <> — <span className="font-semibold">{extractionMeta.segmentation.reason}</span></>
                )}
              </span>
            )}
            <span>
              sources —
              {' '}hero: <span className="font-semibold">{candidateImages.filter((c) => c.source === 'hero').length}</span>
              {' · '}tiles: <span className="font-semibold">{candidateImages.filter((c) => c.source === 'gallery_tile').length}</span>
              {' · '}split: <span className="font-semibold">{candidateImages.filter((c) => c.source === 'split_child').length}</span>
              {' · '}manual: <span className="font-semibold">{candidateImages.filter((c) => c.source === 'manual_crop').length}</span>
            </span>
          </div>
        )}
        {debugMode && screenshotPreview && galleryContainer && (
          <div className="mb-4 relative rounded-lg overflow-hidden border border-white-10 bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screenshotPreview} alt="screenshot preview" className="w-full block" />
            <div
              className="absolute border-2 border-cyan-400 bg-cyan-400/10 pointer-events-none"
              style={{
                left: `${galleryContainer.bbox.x * 100}%`,
                top: `${galleryContainer.bbox.y * 100}%`,
                width: `${galleryContainer.bbox.w * 100}%`,
                height: `${galleryContainer.bbox.h * 100}%`,
              }}
              title="gallery container"
            >
              <span className="absolute -top-5 left-0 px-1 py-0.5 bg-cyan-500 text-[10px] font-semibold text-black rounded">CONTAINER</span>
            </div>
            {heroBbox && (
              <div
                className="absolute border-2 border-lime-400 bg-lime-400/15 pointer-events-none"
                style={{
                  left: `${heroBbox.x * 100}%`,
                  top: `${heroBbox.y * 100}%`,
                  width: `${heroBbox.w * 100}%`,
                  height: `${heroBbox.h * 100}%`,
                }}
                title="hero image"
              >
                <span className="absolute -top-5 left-0 px-1 py-0.5 bg-lime-500 text-[10px] font-semibold text-black rounded">HERO</span>
              </div>
            )}
            {candidateImages
              .filter((c) => c.source === 'gallery_tile' || c.source === 'split_child')
              .map((c) => (
                <div
                  key={`dbg-${c.id}`}
                  className="absolute border-2 border-amber-400 bg-amber-400/10 pointer-events-none"
                  style={{
                    left: `${c.bbox.x * 100}%`,
                    top: `${c.bbox.y * 100}%`,
                    width: `${c.bbox.w * 100}%`,
                    height: `${c.bbox.h * 100}%`,
                  }}
                  title={c.description || c.label}
                />
              ))}
            {/* spinstr102 — scored candidates (not already drawn as hero/tiles) */}
            {extractionMeta.segmentation?.candidates
              ?.filter((c) => !c.selected)
              .map((c) => (
                <div
                  key={`score-${c.id}`}
                  className="absolute border border-orange-300/60 pointer-events-none"
                  style={{
                    left: `${c.bbox.x * 100}%`,
                    top: `${c.bbox.y * 100}%`,
                    width: `${c.bbox.w * 100}%`,
                    height: `${c.bbox.h * 100}%`,
                  }}
                  title={`score ${c.score} — ${Object.entries(c.reasons ?? {}).map(([k, v]) => `${k}:${v}`).join(' · ')}`}
                >
                  <span className="absolute top-0 left-0 px-1 py-0.5 bg-orange-400/90 text-[9px] font-bold text-black rounded">{c.score}</span>
                </div>
              ))}
            {/* spinstr102 — rejected segments (red, dashed) */}
            {extractionMeta.segmentation?.rejected?.map((r) => (
              <div
                key={`rej-${r.id}`}
                className="absolute border border-dashed border-red-400/70 bg-red-500/5 pointer-events-none"
                style={{
                  left: `${r.bbox.x * 100}%`,
                  top: `${r.bbox.y * 100}%`,
                  width: `${r.bbox.w * 100}%`,
                  height: `${r.bbox.h * 100}%`,
                }}
                title={`rejected: ${r.rejectReason}`}
              >
                <span className="absolute top-0 left-0 px-1 py-0.5 bg-red-500/90 text-[9px] font-bold text-white rounded">{r.rejectReason}</span>
              </div>
            ))}
          </div>
        )}
        {debugMode && extractionMeta.segmentation && (
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div className="px-3 py-2 rounded-lg bg-black/40 border border-white-10">
              <p className="text-[10px] uppercase tracking-wider text-green-300 font-semibold mb-1">
                Scored candidates ({extractionMeta.segmentation.candidates?.length ?? 0})
              </p>
              <ul className="text-[11px] text-white-70 space-y-0.5 max-h-48 overflow-auto font-mono">
                {(extractionMeta.segmentation.candidates ?? [])
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((c) => (
                    <li key={c.id} className={c.selected ? 'text-green-300' : ''}>
                      <span className="font-semibold">{c.selected ? '✓' : ' '} {c.score.toString().padStart(3)}</span>
                      {' '}{c.id}
                      {c.stats && (
                        <span className="text-white-40">
                          {' '}σ{c.stats.stdev} H{c.stats.entropy} ΔRGB{c.stats.colorRange}
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
            <div className="px-3 py-2 rounded-lg bg-black/40 border border-white-10">
              <p className="text-[10px] uppercase tracking-wider text-red-300 font-semibold mb-1">
                Rejected ({extractionMeta.segmentation.rejected?.length ?? 0})
              </p>
              <ul className="text-[11px] text-white-70 space-y-0.5 max-h-48 overflow-auto font-mono">
                {(extractionMeta.segmentation.rejected ?? []).map((r) => (
                  <li key={r.id}>
                    <span className="text-red-300">{r.rejectReason}</span>
                    {' '}{r.id}
                    {r.stats && (
                      <span className="text-white-40">
                        {' '}σ{r.stats.stdev} H{r.stats.entropy}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {candidateImages.map((c) => {
            const selected = selectedImageIds.has(c.id);
            const isHero = c.layoutRole === 'hero';
            const confidencePct = Math.round(c.photoConfidence * 100);
            const enhanceReady = hasEnhanced(c);
            const canEnhance =
              (c.qualityLabel === 'low' || c.qualityLabel === 'fair') && !enhanceReady && !c.enhancing;
            return (
              <div
                key={c.id}
                className={cn(
                  'relative group rounded-xl overflow-hidden border-2 transition-all text-left',
                  selected ? 'border-accent-green-110' : 'border-white-10 hover:border-white-30'
                )}
              >
                {/* Thumbnail — click opens the full-size preview modal
                    where the user can enhance / clean / set as hero. Use
                    the checkbox in the top-right to toggle selection.
                    (role=button lets us nest the checkbox + other action
                    buttons without violating button-in-button rules.) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreviewImageId(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPreviewImageId(c.id);
                    }
                  }}
                  className="w-full aspect-square bg-white-5 relative block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-green-110"
                  title="Open full-size preview"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getDisplayUrl(c)}
                    alt={c.description || LABEL_DISPLAY[c.label]}
                    className="w-full h-full object-cover"
                  />
                  {c.enhancing && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                      <p className="text-xs text-white font-medium">Enhancing…</p>
                    </div>
                  )}
                  {c.cleaning && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                      <p className="text-xs text-white font-medium">Cleaning…</p>
                    </div>
                  )}
                  {/* Overlay-detected indicator — visible before cleanup runs.
                      Hides once the cleaned variant is active so the badge
                      doesn't linger after the fix. */}
                  {c.overlays.length > 0 && !c.cleanEnabled && (
                    <div
                      className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-semibold uppercase tracking-wider"
                      title={`${c.overlays.length} overlay region(s) detected`}
                    >
                      <Eraser className="w-3 h-3" />
                      Overlay
                    </div>
                  )}
                  {/* Hero badge */}
                  {isHero && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-green-110 text-sp-surface text-[10px] font-semibold uppercase tracking-wider">
                      <Star className="w-3 h-3" />
                      Hero
                    </div>
                  )}
                  {/* Quality badge */}
                  <div
                    className={cn(
                      'absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                      QUALITY_STYLE[c.qualityLabel],
                    )}
                    title={`Quality score ${c.qualityScore}/100 · Vision confidence ${confidencePct}%`}
                  >
                    {QUALITY_LABEL[c.qualityLabel]} · {c.qualityScore}
                  </div>
                  {/* Enhanced marker */}
                  {c.enhanceEnabled && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-green-110/90 text-sp-surface text-[10px] font-semibold uppercase tracking-wider">
                      <Wand2 className="w-3 h-3" />
                      Enhanced
                    </div>
                  )}
                  {/* Cleaned marker */}
                  {c.overlayRemoved && c.cleanEnabled && !c.enhanceEnabled && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/90 text-white text-[10px] font-semibold uppercase tracking-wider">
                      <Eraser className="w-3 h-3" />
                      Cleaned
                    </div>
                  )}
                  {/* Checkbox — explicit selection control. Stops
                      propagation so clicking the checkbox doesn't also
                      open the preview modal. */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleImage(c.id); }}
                    title={selected ? 'Deselect this image' : 'Select this image'}
                    className={cn(
                      'absolute top-2 right-2 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors',
                      selected
                        ? 'bg-accent-green-110 border-accent-green-110 hover:bg-accent-green-120'
                        : 'bg-black/50 border-white/50 hover:bg-black/70'
                    )}
                  >
                    {selected && <Check className="w-4 h-4 text-sp-surface" />}
                  </button>
                  {/* Debug: sourcePass chip (spinstr99) */}
                  {debugMode && c.sourcePass && (
                    <div className="absolute top-10 right-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-bold uppercase tracking-wider">
                      {c.sourcePass === 'first_pass' ? 'P1' : c.sourcePass === 'second_pass' ? 'P2' : 'SPLIT'}
                    </div>
                  )}
                </div>
                {/* Label + actions */}
                <div className="px-2.5 py-1.5 bg-white-5">
                  <p className="text-xs font-medium text-white-80 truncate">{LABEL_DISPLAY[c.label]}</p>
                  {(() => {
                    const caption = c.description || (isHero ? 'Hero image' : c.layoutRole === 'gallery' ? 'Gallery image' : '');
                    return caption ? (
                      <p className="text-[10px] text-white-40 truncate">{caption}</p>
                    ) : null;
                  })()}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {canEnhance && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); runEnhance(c.id); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent-green-110/15 text-accent-green-110 text-[10px] font-semibold hover:bg-accent-green-110/25 transition-colors"
                      >
                        <Wand2 className="w-3 h-3" />
                        Enhance
                      </button>
                    )}
                    {enhanceReady && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleVariant(c.id); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-white-10 text-white-60 text-[10px] font-semibold hover:bg-white-20 transition-colors"
                        title={c.enhanceEnabled ? 'Switch to original' : 'Switch to enhanced'}
                      >
                        <Undo2 className="w-3 h-3" />
                        {c.enhanceEnabled ? 'Use original' : 'Use enhanced'}
                      </button>
                    )}
                    {/* Overlay cleanup (spinstr106 Phase 2) — only show the
                        button when cleanup hasn't run yet. Once cleaned, the
                        toggle takes its place. */}
                    {!c.cleanedUrl && !c.cleaning && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); runClean(c.id); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/15 text-blue-300 text-[10px] font-semibold hover:bg-blue-500/25 transition-colors"
                        title="Detect & remove room labels, badges, watermarks"
                      >
                        <Eraser className="w-3 h-3" />
                        Clean
                      </button>
                    )}
                    {c.cleanedUrl && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleCleaned(c.id); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-white-10 text-white-60 text-[10px] font-semibold hover:bg-white-20 transition-colors"
                        title={c.cleanEnabled ? 'Switch to original (with overlays)' : 'Switch to cleaned'}
                      >
                        <Undo2 className="w-3 h-3" />
                        {c.cleanEnabled ? 'Show overlays' : 'Hide overlays'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between bg-white-5 border border-white-10 rounded-xl p-4">
          <p className="text-white-60 text-sm">
            <span className="font-semibold text-white-80">{selectedCount}</span> of {candidateImages.length} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep('form')}
              className="px-4 py-2 rounded-lg bg-white-10 text-white-60 font-medium text-sm hover:bg-white-20 transition-colors"
            >
              Skip images
            </button>
            <button
              onClick={() => setStep('form')}
              className="px-5 py-2 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
            >
              Use {selectedCount} image{selectedCount === 1 ? '' : 's'}
            </button>
          </div>
        </div>

        {manualCropOpen && screenshotPreview && (
          <ManualCropModal
            screenshotUrl={screenshotPreview}
            galleryContainer={galleryContainer}
            existingCrops={candidateImages.map((c) => ({ rect: c.bbox, isHero: c.layoutRole === 'hero' }))}
            onCancel={() => setManualCropOpen(false)}
            onCrop={addManualCrop}
          />
        )}

        {libraryPickerOpen && (
          <MediaLibraryPickerModal
            clientId={clientId}
            onClose={() => setLibraryPickerOpen(false)}
            onPick={addFromLibrary}
          />
        )}

        {(() => {
          const previewImage = previewImageId
            ? candidateImages.find((c) => c.id === previewImageId)
            : null;
          if (!previewImage) return null;
          return (
            <ImagePreviewModal
              candidate={previewImage}
              onClose={() => setPreviewImageId(null)}
              onEnhance={runEnhance}
              onToggleEnhanced={toggleVariant}
              onClean={runClean}
              onToggleCleaned={toggleCleaned}
              onSetAsHero={setAsHero}
            />
          );
        })()}
      </div>
    );
  }

  // ── Step 2: Confirm Property Details ──

  if (step === 'form') {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <button
          onClick={() => setStep('source')}
          className="flex items-center gap-1 text-white-40 text-sm hover:text-white-60 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white-100">Property Details</h1>
          {sourceLabel && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-accent-green-110/15 text-accent-green-110">
              {sourceLabel}
            </span>
          )}
        </div>
        <p className="text-white-40 text-sm mb-8">
          Confirm the property info, then choose a campaign type.
        </p>

        {genError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {genError}
          </div>
        )}

        <div className="space-y-6">
          {/* Address section */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Address</label>
            <FormInput
              value={form.address}
              onChange={(v) => updateField('address', v)}
              placeholder="123 Main Street"
              prefilled={prefilledFields.has('address')}
            />
            <div className="grid grid-cols-3 gap-3 mt-2">
              <FormInput value={form.city} onChange={(v) => updateField('city', v)} placeholder="City" prefilled={prefilledFields.has('city')} />
              <FormInput value={form.state} onChange={(v) => updateField('state', v)} placeholder="State" prefilled={prefilledFields.has('state')} />
              <FormInput value={form.zip} onChange={(v) => updateField('zip', v)} placeholder="ZIP" prefilled={prefilledFields.has('zip')} />
            </div>
          </div>

          {/* Specs row */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Price</label>
              <FormInput value={form.price} onChange={(v) => updateField('price', v)} placeholder="450000" type="number" prefilled={prefilledFields.has('price')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Beds</label>
              <FormInput value={form.beds} onChange={(v) => updateField('beds', v)} placeholder="3" type="number" prefilled={prefilledFields.has('beds')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Baths</label>
              <FormInput value={form.baths} onChange={(v) => updateField('baths', v)} placeholder="2" type="number" prefilled={prefilledFields.has('baths')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Sq Ft</label>
              <FormInput value={form.sqft} onChange={(v) => updateField('sqft', v)} placeholder="1800" type="number" prefilled={prefilledFields.has('sqft')} />
            </div>
          </div>

          {/* Property type */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Property Type</label>
            <select
              value={form.propertyType}
              onChange={(e) => updateField('propertyType', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Short Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              placeholder="Charming updated ranch with open floor plan..."
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-white-5 border text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30 resize-none',
                prefilledFields.has('description') ? 'border-accent-green-110/30' : 'border-white-10'
              )}
            />
          </div>

          {/* Highlights */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Notable Features / Highlights</label>
            <textarea
              value={form.highlights}
              onChange={(e) => updateField('highlights', e.target.value)}
              rows={2}
              placeholder="Pool, updated kitchen, corner lot, new roof..."
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-white-5 border text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30 resize-none',
                prefilledFields.has('highlights') ? 'border-accent-green-110/30' : 'border-white-10'
              )}
            />
          </div>

          {/* Neighborhood */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Neighborhood / Lifestyle Notes</label>
            <textarea
              value={form.neighborhood}
              onChange={(e) => updateField('neighborhood', e.target.value)}
              rows={2}
              placeholder="Walking distance to downtown, family-friendly, top-rated schools..."
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30 resize-none"
            />
          </div>

          {/* CTA */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Call to Action</label>
            <FormInput value={form.cta} onChange={(v) => updateField('cta', v)} placeholder="Schedule a showing today" />
          </div>

          {/* Agent info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Agent Name <span className="text-white-20">(optional)</span></label>
              <FormInput value={form.agentName} onChange={(v) => updateField('agentName', v)} placeholder="Jane Smith" prefilled={prefilledFields.has('agentName')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Brokerage <span className="text-white-20">(optional)</span></label>
              <FormInput value={form.brokerage} onChange={(v) => updateField('brokerage', v)} placeholder="Smith Realty" prefilled={prefilledFields.has('brokerage')} />
            </div>
          </div>

          {/* Campaign Notes */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Campaign Notes <span className="text-white-20">(optional)</span></label>
            <textarea
              value={form.campaignNotes}
              onChange={(e) => updateField('campaignNotes', e.target.value)}
              rows={2}
              placeholder="Any special instructions for this campaign..."
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30 resize-none"
            />
          </div>

          {/* Selected images strip */}
          {candidateImages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
                  Campaign Images ({selectedImageIds.size} of {candidateImages.length} selected)
                </label>
                <button
                  onClick={() => setStep('images')}
                  className="text-xs text-accent-green-110 hover:underline"
                >
                  Edit selection
                </button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {candidateImages.filter((c) => selectedImageIds.has(c.id)).map((c) => (
                  <div key={c.id} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getDisplayUrl(c)}
                      alt={LABEL_DISPLAY[c.label]}
                      className="w-16 h-16 rounded-lg object-cover border border-white-10"
                    />
                    <span className="absolute bottom-0.5 left-0.5 text-[9px] px-1 py-0.5 rounded bg-black/70 text-white-80">
                      {LABEL_DISPLAY[c.label]}
                    </span>
                  </div>
                ))}
                {selectedImageIds.size === 0 && (
                  <p className="text-xs text-white-30 italic">No images selected</p>
                )}
              </div>
            </div>
          )}

          {/* Next button */}
          <button
            onClick={() => setStep('campaign-setup')}
            className="w-full py-3.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
          >
            Campaign Setup
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Campaign Setup (type + slot editor) ──

  if (step === 'campaign-setup') {
    const addSlot = () => {
      const maxDay = Math.max(...campaignSlots.map((s) => s.campaignDay), 0);
      setCampaignSlots((prev) => [
        ...prev,
        {
          id: `slot-${Date.now()}`,
          label: `Post ${prev.length + 1}`,
          channel: 'INSTAGRAM',
          campaignDay: maxDay + 2,
        },
      ]);
    };

    const removeSlot = (id: string) => {
      setCampaignSlots((prev) => prev.filter((s) => s.id !== id));
    };

    const updateSlot = (id: string, updates: Partial<CampaignSlotConfig>) => {
      setCampaignSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };

    const uniqueChannels = Array.from(new Set(campaignSlots.map((s) => s.channel)));
    const maxDay = Math.max(...campaignSlots.map((s) => s.campaignDay), 0);

    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <button
          onClick={() => setStep('form')}
          className="flex items-center gap-1 text-white-40 text-sm hover:text-white-60 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to details
        </button>

        <h1 className="text-2xl font-bold text-white-100 mb-1">Campaign Setup</h1>
        <p className="text-white-40 text-sm mb-8">
          Choose your campaign type and customize the post sequence.
        </p>

        {genError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {genError}
          </div>
        )}

        {/* Campaign Type */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-white-60 mb-3 uppercase tracking-wider">Campaign Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CAMPAIGN_TYPES.map((type) => {
              const Icon = type.icon;
              const selected = campaignType === type.key;
              return (
                <button
                  key={type.key}
                  onClick={() => setCampaignType(type.key)}
                  className={cn(
                    'relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                    selected
                      ? 'bg-accent-green-110/10 border-accent-green-110'
                      : 'bg-white-5 border-white-10 hover:border-white-20',
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    selected ? 'bg-accent-green-110/20' : 'bg-white-10',
                  )}>
                    <Icon className={cn('w-5 h-5', selected ? 'text-accent-green-110' : 'text-white-40')} />
                  </div>
                  <div>
                    <span className={cn('font-semibold text-sm', selected ? 'text-accent-green-110' : 'text-white-80')}>
                      {type.label}
                    </span>
                    <p className="text-white-40 text-xs mt-0.5">{type.description}</p>
                  </div>
                  {selected && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-accent-green-110" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Campaign Slots */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white-60 uppercase tracking-wider">Campaign Sequence</h2>
            <span className="text-xs text-white-30">{campaignSlots.length} post{campaignSlots.length === 1 ? '' : 's'}</span>
          </div>

          <div className="space-y-2">
            {campaignSlots.map((slot) => (
              <div key={slot.id} className="flex items-center gap-3 bg-white-5 border border-white-10 rounded-xl p-3">
                <div className="shrink-0 w-14">
                  <label className="text-[9px] text-white-20 uppercase tracking-wider block mb-0.5">Day</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={slot.campaignDay}
                    onChange={(e) => updateSlot(slot.id, { campaignDay: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 rounded-md bg-white-5 border border-white-10 text-white-80 text-xs focus:outline-none focus:border-accent-green-110"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[9px] text-white-20 uppercase tracking-wider block mb-0.5">Label</label>
                  <input
                    value={slot.label}
                    onChange={(e) => updateSlot(slot.id, { label: e.target.value })}
                    className="w-full px-2 py-1 rounded-md bg-white-5 border border-white-10 text-white-80 text-xs focus:outline-none focus:border-accent-green-110"
                    placeholder="Post title..."
                  />
                </div>
                <div className="shrink-0 w-32">
                  <label className="text-[9px] text-white-20 uppercase tracking-wider block mb-0.5">Channel</label>
                  <select
                    value={slot.channel}
                    onChange={(e) => updateSlot(slot.id, { channel: e.target.value })}
                    className="w-full px-2 py-1 rounded-md bg-white-5 border border-white-10 text-white-80 text-xs focus:outline-none focus:border-accent-green-110"
                  >
                    {AVAILABLE_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => removeSlot(slot.id)}
                  disabled={campaignSlots.length <= 1}
                  className="shrink-0 p-1.5 rounded-md text-white-30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed mt-3"
                  title="Remove this slot"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={addSlot}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Post
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white-5 border border-white-10 rounded-xl p-4 mb-6">
          <p className="text-white-60 text-xs">
            This campaign will generate <strong className="text-white-80">{campaignSlots.length} coordinated post{campaignSlots.length === 1 ? '' : 's'}</strong> across{' '}
            <strong className="text-white-80">{uniqueChannels.join(', ')}</strong>{' '}
            — each with a different angle, scheduled over {maxDay} day{maxDay === 1 ? '' : 's'}.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={campaignSlots.length === 0}
          className="w-full py-3.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50"
        >
          Generate {campaignTypeLabel} Campaign
        </button>
      </div>
    );
  }

  // ── Step 4: Generating ──

  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-accent-green-110 mb-4" />
        <p className="text-white-60 text-sm animate-pulse">
          Creating your {campaignTypeLabel} campaign...
        </p>
      </div>
    );
  }

  // ── Step 5: Campaign Builder (Timeline + Image Pool + Save) ──

  if (step === 'output' && campaign) {
    const posts = campaignPosts;
    const addressLine = form.address ? `${form.address}${form.city ? `, ${form.city}` : ''}` : 'Listing Campaign';

    // Build image pool from selected candidates for per-post assignment
    const imagePool: ImagePoolItem[] = candidateImages
      .filter((c) => selectedImageIds.has(c.id))
      .map((c) => ({ id: c.id, displayUrl: getDisplayUrl(c), label: LABEL_DISPLAY[c.label] }));

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white-100">
                {campaign.campaignName || 'Campaign Builder'}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 font-medium">
                {campaignTypeLabel}
              </span>
            </div>
            <p className="text-white-40 text-sm">
              {addressLine} &middot; {posts.length} posts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generateCampaign.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-10 text-white-60 font-semibold text-sm hover:bg-white-20 transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', generateCampaign.isPending && 'animate-spin')} />
              Regenerate All
            </button>
            <button
              onClick={resetWizard}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-10 text-white-60 font-semibold text-sm hover:bg-white-20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Image Pool — reusable assets the user can assign to individual posts */}
        {imagePool.length > 0 && (
          <div className="mt-6 mb-4 bg-white-5 border border-white-10 rounded-xl p-4">
            <p className="text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
              Image Pool ({imagePool.length}) — click a post&apos;s &quot;Images&quot; button to assign
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {imagePool.map((img) => (
                <div key={img.id} className="relative shrink-0 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.displayUrl}
                    alt={img.label}
                    className="w-20 h-20 rounded-lg object-cover border border-white-10"
                  />
                  <span className="absolute bottom-0.5 left-0.5 text-[9px] px-1 py-0.5 rounded bg-black/70 text-white-80">
                    {img.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign Timeline */}
        <div className="space-y-3 mb-8 mt-6">
          {posts.map((post, idx) => (
            <CampaignPostCard
              key={`post-${idx}-${post.campaignDay}`}
              post={post}
              index={idx}
              totalPosts={posts.length}
              onUpdate={updatePost}
              onRegenerate={handleRegeneratePost}
              isRegenerating={regeneratingIndex === idx}
              imagePool={imagePool}
            />
          ))}
        </div>

        {/* Schedule Preset + Action Bar */}
        <div className="bg-white-5 border border-white-10 rounded-xl p-5 space-y-4">
          {/* Schedule preset selector */}
          <div>
            <p className="text-xs font-medium text-white-40 uppercase tracking-wider mb-2">Schedule Preset</p>
            <div className="flex items-center gap-2">
              {([7, 10, 14] as SchedulePreset[]).map((days) => (
                <button
                  key={days}
                  onClick={() => setSchedulePreset(days)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    schedulePreset === days
                      ? 'bg-accent-green-110 text-sp-surface'
                      : 'bg-white-10 text-white-40 hover:bg-white-20 hover:text-white-60'
                  )}
                >
                  {days}-day
                </button>
              ))}
              <span className="text-xs text-white-30 ml-2">
                Posts spaced across {schedulePreset} days
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-white-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSaveDrafts(false)}
                disabled={saveDrafts.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white-10 text-white-60 font-semibold text-sm hover:bg-white-20 transition-colors disabled:opacity-50"
              >
                {saveDrafts.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save as Drafts
              </button>
              <button
                onClick={() => handleSaveDrafts(true)}
                disabled={saveDrafts.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50"
              >
                <CalendarPlus className="w-4 h-4" />
                Launch Campaign
              </button>
            </div>
            {saveSuccess && (
              <span className={cn(
                'text-sm font-medium',
                saveSuccess.includes('Failed') ? 'text-red-400' : 'text-green-400'
              )}>
                {saveSuccess}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Subcomponents ──

function SourceCard({
  icon: Icon,
  title,
  description,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white-5 border border-white-10 rounded-xl p-5 transition-all',
        onClick && 'cursor-pointer hover:border-white-20 hover:bg-white-8'
      )}
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-white-10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-white-40" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white-80">{title}</p>
          <p className="text-xs text-white-40">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FormInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  prefilled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  prefilled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className={cn(
        'w-full px-4 py-2.5 rounded-lg bg-white-5 border text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30',
        prefilled ? 'border-accent-green-110/30' : 'border-white-10'
      )}
    />
  );
}

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
  LINKEDIN: Mail,
  X: FileText,
};

const ANGLE_LABELS: Record<string, string> = {
  promotional: 'Promotional',
  lifestyle: 'Lifestyle',
  urgency: 'Urgency',
  storytelling: 'Storytelling',
  authority: 'Authority',
  social_proof: 'Social Proof',
};

function CampaignPostCard({
  post,
  index,
  totalPosts,
  onUpdate,
  onRegenerate,
  isRegenerating,
  imagePool = [],
}: {
  post: CampaignPost;
  index: number;
  totalPosts: number;
  onUpdate: (index: number, updates: Partial<CampaignPost>) => void;
  onRegenerate: (index: number) => void;
  isRegenerating: boolean;
  imagePool?: ImagePoolItem[];
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAlt, setShowAlt] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  // Local hashtag text while editing — parsed back to array on blur
  const [hashtagText, setHashtagText] = useState('');

  const displayBody = showAlt && post.bodyAlt ? post.bodyAlt : post.body;
  const ChannelIcon = CHANNEL_ICONS[post.channel] ?? FileText;
  const angleLabel = ANGLE_LABELS[post.angle] ?? post.angle;

  const fullText = [
    post.subject ? `Subject: ${post.subject}\n\n` : '',
    displayBody,
    post.hashtags?.length ? `\n\n${post.hashtags.map((h) => `#${h}`).join(' ')}` : '',
    post.cta ? `\n\n${post.cta}` : '',
  ].join('');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enterEditing = () => {
    setHashtagText((post.hashtags ?? []).join(', '));
    setIsEditing(true);
  };

  const exitEditing = () => {
    // Parse hashtag text back to array
    const tags = hashtagText
      .split(/[,]+/)
      .map((t) => t.replace(/^#/, '').trim())
      .filter(Boolean);
    onUpdate(index, { hashtags: tags });
    setIsEditing(false);
  };

  return (
    <div className={cn(
      'bg-white-5 border border-white-10 rounded-xl overflow-hidden transition-opacity',
      isRegenerating && 'opacity-60',
    )}>
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white-8 transition-colors"
      >
        {/* Timeline indicator */}
        <div className="flex flex-col items-center gap-0.5 shrink-0 w-10">
          <span className="text-xs font-bold text-accent-green-110">Day {post.campaignDay}</span>
          <span className="text-[10px] text-white-20">{index + 1}/{totalPosts}</span>
        </div>

        {/* Channel icon */}
        <div className="w-8 h-8 rounded-lg bg-white-10 flex items-center justify-center shrink-0">
          <ChannelIcon className="w-4 h-4 text-white-40" />
        </div>

        {/* Label + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white-80 truncate">{post.label}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-white-30">{post.channel}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white-10 text-white-40">{angleLabel}</span>
            {post.imageHint && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300" title="Suggested image for this post">
                {post.imageHint}
              </span>
            )}
            {post.hookScore != null && (
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  post.hookScore >= 70 ? 'bg-green-500/10 text-green-400' :
                  post.hookScore >= 40 ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-red-500/10 text-red-400',
                )}
                title={`Hook quality: ${post.hookScore}/100`}
              >
                Hook {post.hookScore}
              </span>
            )}
          </div>
        </div>

        {/* Quick actions (don't expand on click) */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white-10 text-white-40 text-xs font-medium hover:bg-white-20 hover:text-white-60 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => onRegenerate(index)}
            disabled={isRegenerating}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white-10 text-white-40 text-xs font-medium hover:bg-white-20 hover:text-white-60 transition-colors disabled:opacity-50"
            title="Regenerate this post only"
          >
            <RefreshCw className={cn('w-3 h-3', isRegenerating && 'animate-spin')} />
            Regen
          </button>
        </div>

        {/* Expand indicator */}
        <ArrowLeft className={cn(
          'w-4 h-4 text-white-20 shrink-0 transition-transform',
          expanded ? 'rotate-90' : '-rotate-90'
        )} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-white-10">
          <div className="flex items-center justify-between gap-2 mb-2 mt-2">
            {/* A/B body toggle */}
            {post.bodyAlt && (
              <div className="flex items-center gap-0.5 bg-white-5 rounded-lg p-0.5">
                <button
                  onClick={() => setShowAlt(false)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    !showAlt ? 'bg-accent-green-110 text-sp-surface' : 'text-white-40 hover:text-white-60',
                  )}
                >
                  Version A
                </button>
                <button
                  onClick={() => setShowAlt(true)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    showAlt ? 'bg-accent-green-110 text-sp-surface' : 'text-white-40 hover:text-white-60',
                  )}
                >
                  Version B
                </button>
              </div>
            )}
            <button
              onClick={() => isEditing ? exitEditing() : enterEditing()}
              className="px-2 py-1 rounded-lg text-white-30 text-xs hover:text-white-60 hover:bg-white-10 transition-colors ml-auto"
            >
              {isEditing ? 'Done editing' : 'Edit'}
            </button>
          </div>

          {/* Subject (email posts) */}
          {(post.subject || isEditing) && (
            <div className="mb-2">
              {isEditing ? (
                <div>
                  <label className="text-[10px] text-white-30 uppercase tracking-wider mb-1 block">Subject</label>
                  <input
                    value={post.subject}
                    onChange={(e) => onUpdate(index, { subject: e.target.value })}
                    placeholder="Subject line..."
                    className="w-full text-white-100 font-semibold text-sm bg-white-5 border border-white-10 rounded-lg px-3 py-2 focus:outline-none focus:border-accent-green-110"
                  />
                </div>
              ) : (
                <p className="text-white-100 font-semibold text-sm">Subject: {post.subject}</p>
              )}
            </div>
          )}

          {/* Body */}
          {isEditing ? (
            <textarea
              value={showAlt && post.bodyAlt !== undefined ? post.bodyAlt : post.body}
              onChange={(e) => {
                if (showAlt && post.bodyAlt !== undefined) {
                  onUpdate(index, { bodyAlt: e.target.value });
                } else {
                  onUpdate(index, { body: e.target.value });
                }
              }}
              className="w-full text-white-80 text-sm leading-relaxed bg-white-5 border border-white-10 rounded-lg p-3 resize-none focus:outline-none focus:border-accent-green-110 min-h-[120px]"
            />
          ) : (
            <p className="text-white-80 text-sm leading-relaxed whitespace-pre-wrap">
              {displayBody}
            </p>
          )}

          {/* Hashtags */}
          {isEditing ? (
            <div className="mt-3">
              <label className="text-[10px] text-white-30 uppercase tracking-wider mb-1 block">Hashtags (comma-separated)</label>
              <input
                value={hashtagText}
                onChange={(e) => setHashtagText(e.target.value)}
                className="w-full text-white-80 text-sm bg-white-5 border border-white-10 rounded-lg px-3 py-2 focus:outline-none focus:border-accent-green-110"
                placeholder="realestate, newlisting, dreamhome"
              />
            </div>
          ) : post.hashtags && post.hashtags.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-3">
              {post.hashtags.map((h) => (
                <span key={h} className="text-accent-green-110/70 text-xs">#{h}</span>
              ))}
            </div>
          ) : null}

          {/* CTA */}
          {isEditing ? (
            <div className="mt-3">
              <label className="text-[10px] text-white-30 uppercase tracking-wider mb-1 block">Call to Action</label>
              <input
                value={post.cta}
                onChange={(e) => onUpdate(index, { cta: e.target.value })}
                className="w-full text-white-80 text-sm bg-white-5 border border-white-10 rounded-lg px-3 py-2 focus:outline-none focus:border-accent-green-110"
                placeholder="Schedule a showing today"
              />
            </div>
          ) : post.cta ? (
            <p className="text-white-40 text-xs mt-3 pt-3 border-t border-white-10">
              CTA: {post.cta}
            </p>
          ) : null}

          {/* Campaign day editor */}
          {isEditing && (
            <div className="mt-3">
              <label className="text-[10px] text-white-30 uppercase tracking-wider mb-1 block">Campaign Day</label>
              <input
                type="number"
                min={1}
                max={30}
                value={post.campaignDay}
                onChange={(e) => onUpdate(index, { campaignDay: parseInt(e.target.value) || 1 })}
                className="w-20 text-white-80 text-sm bg-white-5 border border-white-10 rounded-lg px-3 py-2 focus:outline-none focus:border-accent-green-110"
              />
            </div>
          )}

          {/* Per-post image assignment */}
          {imagePool.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-white-30 uppercase tracking-wider">
                  Assigned Images ({(post.assignedImageIds ?? []).length})
                </span>
                <button
                  onClick={() => setShowImagePicker(!showImagePicker)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-white-10 text-white-60 text-[10px] font-medium hover:bg-white-20 transition-colors"
                >
                  <Images className="w-3 h-3" />
                  {showImagePicker ? 'Done' : 'Assign'}
                </button>
              </div>

              {/* Assigned image thumbnails */}
              {(post.assignedImageIds ?? []).length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2">
                  {(post.assignedImageIds ?? []).map((imgId) => {
                    const img = imagePool.find((p) => p.id === imgId);
                    if (!img) return null;
                    return (
                      <div key={imgId} className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.displayUrl}
                          alt={img.label}
                          className="w-12 h-12 rounded-md object-cover border border-accent-green-110/50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (post.assignedImageIds ?? []).filter((id) => id !== imgId);
                            onUpdate(index, { assignedImageIds: next });
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                          title="Remove"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Image picker — click to toggle assignment */}
              {showImagePicker && (
                <div className="flex items-center gap-2 flex-wrap">
                  {imagePool.map((img) => {
                    const isAssigned = (post.assignedImageIds ?? []).includes(img.id);
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => {
                          const current = post.assignedImageIds ?? [];
                          const next = isAssigned
                            ? current.filter((id) => id !== img.id)
                            : [...current, img.id];
                          onUpdate(index, { assignedImageIds: next });
                        }}
                        className={cn(
                          'relative shrink-0 rounded-md overflow-hidden border-2 transition-colors',
                          isAssigned ? 'border-accent-green-110' : 'border-white-10 hover:border-white-30',
                        )}
                        title={isAssigned ? `Remove ${img.label}` : `Assign ${img.label}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.displayUrl} alt={img.label} className="w-14 h-14 object-cover" />
                        {isAssigned && (
                          <div className="absolute inset-0 bg-accent-green-110/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-accent-green-110" />
                          </div>
                        )}
                        <span className="absolute bottom-0 left-0 right-0 text-[8px] px-1 py-0.5 bg-black/70 text-white-80 truncate">
                          {img.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Manual crop modal (spinstr100) ──
// Users draw a rectangle over the screenshot to add a tile the auto-extractor
// missed. Coordinates are normalized (0..1) so they line up with the rest of
// the bbox pipeline.

interface ManualCropModalProps {
  screenshotUrl: string;
  galleryContainer: ExtractedGalleryContainer | null;
  // Previously-drawn crops (normalized 0..1). Rendered as ghost overlays on
  // the screenshot so the user can see what they've already grabbed while
  // drawing a new rectangle.
  existingCrops?: Array<{ rect: { x: number; y: number; w: number; h: number }; isHero: boolean }>;
  onCancel: () => void;
  onCrop: (rect: { x: number; y: number; w: number; h: number }) => void | Promise<void>;
}

function ManualCropModal({ screenshotUrl, galleryContainer, existingCrops, onCancel, onCrop }: ManualCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalize = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return null;
    const bounds = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (e.clientY - bounds.top) / bounds.height));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (submitting) return;
    const pt = normalize(e);
    if (!pt) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart(pt);
    setDragCurrent(pt);
    setRect(null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart) return;
    const pt = normalize(e);
    if (!pt) return;
    setDragCurrent(pt);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStart || !dragCurrent) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    const x = Math.min(dragStart.x, dragCurrent.x);
    const y = Math.min(dragStart.y, dragCurrent.y);
    const w = Math.abs(dragCurrent.x - dragStart.x);
    const h = Math.abs(dragCurrent.y - dragStart.y);
    setDragStart(null);
    setDragCurrent(null);
    // Reject tiny drags (treat as click)
    if (w < 0.01 || h < 0.01) {
      setRect(null);
      return;
    }
    setRect({ x, y, w, h });
  };

  // Live rect while dragging
  const liveRect = dragStart && dragCurrent
    ? {
        x: Math.min(dragStart.x, dragCurrent.x),
        y: Math.min(dragStart.y, dragCurrent.y),
        w: Math.abs(dragCurrent.x - dragStart.x),
        h: Math.abs(dragCurrent.y - dragStart.y),
      }
    : rect;

  const handleConfirm = async () => {
    if (!rect || submitting) return;
    setSubmitting(true);
    try {
      await onCrop(rect);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-sp-surface border border-white-10 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white-10">
          <div>
            <h2 className="text-white-100 font-semibold text-base">Draw a crop</h2>
            <p className="text-white-40 text-xs">Click and drag over the photo you want. Release to confirm the rectangle.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="p-1.5 rounded-md text-white-60 hover:text-white-100 hover:bg-white-10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div
            ref={containerRef}
            className="relative w-full select-none touch-none cursor-crosshair bg-black/40 rounded-lg overflow-hidden border border-white-10"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screenshotUrl} alt="screenshot" className="w-full block pointer-events-none" draggable={false} />
            {/* Hint the container so users know where to draw */}
            {galleryContainer && (
              <div
                className="absolute border-2 border-dashed border-cyan-400/60 pointer-events-none"
                style={{
                  left: `${galleryContainer.bbox.x * 100}%`,
                  top: `${galleryContainer.bbox.y * 100}%`,
                  width: `${galleryContainer.bbox.w * 100}%`,
                  height: `${galleryContainer.bbox.h * 100}%`,
                }}
              >
                <span className="absolute -top-5 left-0 px-1 py-0.5 bg-cyan-500/80 text-[10px] font-semibold text-black rounded">gallery</span>
              </div>
            )}
            {/* Ghost overlays for previously drawn crops so users can see
                what they've already grabbed. Hero is tinted stronger than
                gallery tiles. */}
            {existingCrops?.map((ec, idx) => (
              <div
                key={`existing-${idx}`}
                className={cn(
                  'absolute border-2 pointer-events-none',
                  ec.isHero
                    ? 'border-accent-green-110/80 bg-accent-green-110/10'
                    : 'border-white/50 bg-white/5',
                )}
                style={{
                  left: `${ec.rect.x * 100}%`,
                  top: `${ec.rect.y * 100}%`,
                  width: `${ec.rect.w * 100}%`,
                  height: `${ec.rect.h * 100}%`,
                }}
              >
                <span
                  className={cn(
                    'absolute -top-5 left-0 px-1 py-0.5 text-[10px] font-semibold rounded',
                    ec.isHero
                      ? 'bg-accent-green-110 text-sp-surface'
                      : 'bg-white/80 text-black',
                  )}
                >
                  {ec.isHero ? `hero` : `#${idx + 1}`}
                </span>
              </div>
            ))}
            {liveRect && (
              <div
                className="absolute border-2 border-accent-green-110 bg-accent-green-110/20 pointer-events-none"
                style={{
                  left: `${liveRect.x * 100}%`,
                  top: `${liveRect.y * 100}%`,
                  width: `${liveRect.w * 100}%`,
                  height: `${liveRect.h * 100}%`,
                }}
              />
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white-10 flex items-center justify-between gap-3">
          <p className="text-white-40 text-xs">
            {rect
              ? `Selection: ${(rect.w * 100).toFixed(1)}% × ${(rect.h * 100).toFixed(1)}%`
              : 'No selection yet.'}
          </p>
          <div className="flex items-center gap-2">
            {rect && (
              <button
                type="button"
                onClick={() => setRect(null)}
                disabled={submitting}
                className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg bg-white-10 text-white-80 text-xs font-medium hover:bg-white-20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!rect || submitting}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-accent-green-110 text-sp-surface text-xs font-semibold hover:bg-accent-green-120 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crop className="w-3.5 h-3.5" />}
              Add crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Image preview modal (spinstr112) ──
// Opens when a thumbnail is clicked. Shows the full-size image so users can
// see what enhancement / cleanup actually did. Hosts the hero selector so
// users can reassign which crop is the flagship image. All mutations run
// through the same handlers the grid uses, so changes propagate immediately
// back to the thumbnail strip when the modal closes.

interface ImagePreviewModalProps {
  candidate: CandidateImage;
  onClose: () => void;
  onEnhance: (id: string) => void;
  onToggleEnhanced: (id: string) => void;
  onClean: (id: string) => void;
  onToggleCleaned: (id: string) => void;
  onSetAsHero: (id: string) => void;
}

function ImagePreviewModal({
  candidate,
  onClose,
  onEnhance,
  onToggleEnhanced,
  onClean,
  onToggleCleaned,
  onSetAsHero,
}: ImagePreviewModalProps) {
  const isHero = candidate.layoutRole === 'hero';
  const enhanceReady = hasEnhanced(candidate);
  const canEnhance = !enhanceReady && !candidate.enhancing;
  const caption = candidate.description || (isHero ? 'Hero image' : 'Image preview');
  const displayUrl = getDisplayUrl(candidate);
  // Lock the viewer's aspect ratio to the original crop. Enhancement can
  // change pixel dimensions (upscaling), but the ratio is preserved — so we
  // pin the CSS aspect-ratio to originalUrl's intrinsic ratio, which prevents
  // layout jumping as the user toggles between variants.
  const aspect = candidate.pixelWidth && candidate.pixelHeight
    ? candidate.pixelWidth / candidate.pixelHeight
    : 1;
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-sp-surface border border-white-10 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white-10">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-white-100 font-semibold text-base truncate">{caption}</h2>
            {isHero && (
              <span className="px-2 py-0.5 rounded-md bg-accent-green-110 text-sp-surface text-[10px] font-bold uppercase tracking-wider">
                Hero
              </span>
            )}
            {candidate.enhanceEnabled && !candidate.enhancementSkippedReason && (
              <span
                className="px-2 py-0.5 rounded-md bg-accent-green-110/20 text-accent-green-110 text-[10px] font-semibold uppercase tracking-wider"
                title={
                  candidate.enhancementApplied
                    ? `Type: ${candidate.enhancementType ?? 'photo'} · Applied: ${enhancementSummary(candidate.enhancementApplied)}`
                    : undefined
                }
              >
                Enhanced
              </span>
            )}
            {candidate.enhanceEnabled && candidate.enhancementSkippedReason && (
              <span
                className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-semibold uppercase tracking-wider"
                title={`Enhancement skipped: ${candidate.enhancementSkippedReason}`}
              >
                Enhance skipped
              </span>
            )}
            {candidate.enhancementType && candidate.enhancementType !== 'property_photo' && (
              <span
                className="px-2 py-0.5 rounded-md bg-white-10 text-white-60 text-[10px] font-semibold uppercase tracking-wider"
                title={`Detected type: ${candidate.enhancementType}`}
              >
                {candidate.enhancementType.replace('_', ' ')}
              </span>
            )}
            {candidate.cleanEnabled && (
              <span
                className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-semibold uppercase tracking-wider"
                title={cleanupSummary(candidate)}
              >
                Cleaned
                {candidate.cleanupOverlayCount.removed > 0 && (
                  <span className="ml-1 text-blue-200/80">
                    ×{candidate.cleanupOverlayCount.removed}
                  </span>
                )}
              </span>
            )}
            {candidate.cleanupConfidence === 'low' && !candidate.cleanEnabled && candidate.cleanupOverlayCount.detected > 0 && (
              <span
                className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-semibold uppercase tracking-wider"
                title="Cleanup confidence too low — kept the original to avoid repainting photo content"
              >
                Cleanup skipped
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-white-60 hover:text-white-100 hover:bg-white-10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-black/40 flex items-center justify-center">
          {/* Fixed-aspect container keeps the viewer size constant across
              variant toggles so the image never jumps around. */}
          <div
            className="relative max-w-full max-h-[70vh]"
            style={{ aspectRatio: aspect, width: 'min(100%, calc(70vh * ' + aspect + '))' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt={caption}
              className="absolute inset-0 w-full h-full object-contain rounded-lg"
              draggable={false}
            />
            {(candidate.enhancing || candidate.cleaning) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white-10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onSetAsHero(candidate.id)}
              disabled={isHero}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                isHero
                  ? 'bg-accent-green-110/15 text-accent-green-110/60 cursor-not-allowed'
                  : 'bg-accent-green-110 text-sp-surface hover:bg-accent-green-120',
              )}
              title={isHero ? 'This image is already the hero' : 'Use this as the flagship image'}
            >
              <Star className="w-3.5 h-3.5" />
              {isHero ? 'Current hero' : 'Set as hero'}
            </button>

            {canEnhance && (
              <button
                type="button"
                onClick={() => onEnhance(candidate.id)}
                disabled={candidate.enhancing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green-110/15 text-accent-green-110 text-xs font-semibold hover:bg-accent-green-110/25 transition-colors disabled:opacity-40"
              >
                {candidate.enhancing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                Enhance
              </button>
            )}

            {enhanceReady && (
              <button
                type="button"
                onClick={() => onToggleEnhanced(candidate.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-10 text-white-80 text-xs font-semibold hover:bg-white-20 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                {candidate.enhanceEnabled ? 'Use original' : 'Use enhanced'}
              </button>
            )}

            {!candidate.cleanedUrl && (
              <button
                type="button"
                onClick={() => onClean(candidate.id)}
                disabled={candidate.cleaning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 text-xs font-semibold hover:bg-blue-500/25 transition-colors disabled:opacity-40"
                title="Detect & remove room labels, badges, watermarks"
              >
                {candidate.cleaning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Eraser className="w-3.5 h-3.5" />
                )}
                Clean
              </button>
            )}

            {candidate.cleanedUrl && (
              <button
                type="button"
                onClick={() => onToggleCleaned(candidate.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-10 text-white-80 text-xs font-semibold hover:bg-white-20 transition-colors"
                title={candidate.cleanEnabled ? 'Switch to original (with overlays)' : 'Switch to cleaned'}
              >
                <Undo2 className="w-3.5 h-3.5" />
                {candidate.cleanEnabled ? 'Show overlays' : 'Hide overlays'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white-10 text-white-80 text-xs font-medium hover:bg-white-20 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Media Library Picker Modal ─────────────────────────────────────────
//
// Lets users pull ready images from their workspace media library into the
// listing campaign as candidate tiles. Reuses `useAssets` with status/
// assetType filters so the server returns only usable images.

interface MediaLibraryPickerModalProps {
  clientId: string;
  onClose: () => void;
  onPick: (asset: MediaAsset) => void | Promise<void>;
}

function MediaLibraryPickerModal({ clientId, onClose, onPick }: MediaLibraryPickerModalProps) {
  const { data: assets, isLoading } = useAssets(clientId, {
    assetType: 'image',
    status: 'READY',
  });
  const [pickingId, setPickingId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePick = async (asset: MediaAsset) => {
    setPickingId(asset.id);
    try {
      await onPick(asset);
    } finally {
      setPickingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl mx-4 bg-sp-surface rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white-10 shrink-0">
          <h3 className="text-sm font-semibold text-white-100 flex items-center gap-2">
            <Images className="w-4 h-4" /> Add from media library
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-white-40 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading library…
            </div>
          ) : !assets || assets.length === 0 ? (
            <div className="text-center py-12 text-white-40 text-sm">
              <Images className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No images in the library yet.</p>
              <p className="text-xs mt-1 text-white-30">Upload or generate images first from the Assets page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {assets.map((asset) => {
                const busy = pickingId === asset.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    disabled={busy || !asset.url}
                    onClick={() => handlePick(asset)}
                    className={cn(
                      'group relative aspect-square rounded-lg overflow-hidden bg-black/40 border border-white-10 hover:border-accent-green-110 transition-colors',
                      busy && 'opacity-60 cursor-wait',
                    )}
                    title={asset.filename ?? asset.caption ?? 'Add to campaign'}
                  >
                    {asset.thumbnailUrl || asset.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.thumbnailUrl ?? asset.url ?? ''}
                        alt={asset.altText ?? asset.filename ?? ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white-30">
                        <Images className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {busy ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <span className="px-2 py-1 rounded bg-accent-green-110 text-sp-surface text-xs font-semibold flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          Add
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-3 border-t border-white-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white-10 text-white-80 text-xs font-medium hover:bg-white-20 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
