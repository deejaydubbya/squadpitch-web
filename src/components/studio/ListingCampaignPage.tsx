'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  FolderOpen,
  Tag,
  CheckSquare,
  AlertTriangle,
  Search,
  ImageIcon,
  ExternalLink,
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
  useUploadAsset,
  useUploadAssetFromUrl,
  useCreateFolder,
  autoTagAssetWithResult,
  useProperties,
  useDataItems,
  useRecommendations,
  useAssets,
  useFolders,
  useAssetTagDefaults,
  useChannelConnectionStatus,
  type AssetFolder,
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
  type UnifiedListing,
} from '@/hooks/useSquadpitch';
import { useSubscription } from '@/hooks/useBilling';
import { isAtOrAboveTier } from '@/lib/tierConfig';
import { UpgradeTriggerBanner } from '@/components/billing/UpgradeTriggerBanner';
import { PropertySearchModal } from '@/components/studio/PropertySearchModal';
import { StepIndicator, type StepDef } from '@/components/studio/StepIndicator';
import { getChannelLabel, getChannelRequirementHint } from '@/lib/channelRegistry';
import {
  SLOT_PURPOSE_HINTS,
  SLOT_MEDIA_HINTS,
  DEFAULT_CAMPAIGN_SLOTS,
  SEQUENCE_PRESETS,
  type CampaignSlotConfig,
  type SequencePreset,
} from '@/lib/assistant/schedulePresets';

// ── Types ──

type Step = 'source' | 'images' | 'form' | 'campaign-setup' | 'campaign-type' | 'generating' | 'campaign-builder' | 'output';

const CAMPAIGN_STEPS: StepDef[] = [
  { key: 'source', label: 'Source', description: 'Choose a listing to promote' },
  { key: 'images', label: 'Media', description: 'Select the best photos for your campaign' },
  { key: 'form', label: 'Details', description: 'Confirm property details and listing info' },
  { key: 'campaign', label: 'Campaign', description: 'Choose your campaign type and schedule' },
];

function stepToIndicatorKey(step: Step): string | null {
  switch (step) {
    case 'source': return 'source';
    case 'images': return 'images';
    case 'form': return 'form';
    case 'campaign-setup':
    case 'campaign-type':
    case 'generating':
      return 'campaign';
    default:
      return null;
  }
}

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
  // Media library asset ID — set when the image has been uploaded to the library
  assetId?: string | null;
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

// Listing pages embed social-share icons, logos, and tracking pixels alongside
// the actual property photos. Drop URLs that match common icon naming patterns
// before we spend an upload + auto-tag round-trip on them.
const LISTING_ICON_PATTERN = /(?:^|[/_-])(icon|favicon|logo|sprite|avatar|badge|watermark|beacon|pixel|tracker|facebook|instagram|twitter|youtube|linkedin|tiktok|pinterest|snapchat|whatsapp)s?(?:[/_.-]|$)/i;
function filterListingImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    if (!url || typeof url !== 'string') continue;
    if (seen.has(url)) continue;
    seen.add(url);
    const path = url.split('?')[0].toLowerCase();
    if (path.endsWith('.svg')) continue;
    if (LISTING_ICON_PATTERN.test(path)) continue;
    out.push(url);
  }
  return out;
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
  pool: 3.9,
  garage: 3.8,
  aerial: 3.7,
  office: 3.6,
  neighborhood: 3.5,
  laundry: 3.4,
  detail: 3.3,
  floorplan: 3.2,
  other: 1,
};

// Set of all valid room/area labels for tag→label mapping.
// Used by both loadListingImages and handleDirectUpload.
const LABEL_TAGS_SET = new Set<ImageRegionLabel>([
  'exterior', 'kitchen', 'living_room', 'bedroom',
  'bathroom', 'backyard', 'dining_room',
  'garage', 'pool', 'office', 'laundry',
  'floorplan', 'aerial', 'neighborhood', 'detail',
  'other',
]);

const LABEL_DISPLAY: Record<ImageRegionLabel, string> = {
  exterior: 'Exterior',
  kitchen: 'Kitchen',
  living_room: 'Living Room',
  backyard: 'Backyard',
  dining_room: 'Dining Room',
  bedroom: 'Bedroom',
  bathroom: 'Bathroom',
  garage: 'Garage',
  pool: 'Pool',
  office: 'Office',
  laundry: 'Laundry',
  floorplan: 'Floor Plan',
  aerial: 'Aerial',
  neighborhood: 'Neighborhood',
  detail: 'Detail',
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
  yearBuilt: string;
  daysOnMarket: string;
  listingStatus: string;
  lotSize: string;
  listedDate: string;
  listingUrl: string;
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
  yearBuilt: '',
  daysOnMarket: '',
  listingStatus: '',
  lotSize: '',
  listedDate: '',
  listingUrl: '',
};

// ── Listing portal URL builders ──────────────────────────────────────────

function buildListingSearchUrls(form: { address: string; city: string; state: string; zip: string }) {
  const { address, city, state, zip } = form;
  if (!address && !city) return { zillow: null, realtor: null, redfin: null };

  const zillowSlug = [address, city, state, zip].filter(Boolean).join('-').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  const zillow = zillowSlug ? `https://www.zillow.com/homes/${zillowSlug}_rb/` : null;

  const realtorSlug = address
    ? `${address.replace(/\s+/g, '_')}_${city}_${state}_${zip}`.replace(/[^a-zA-Z0-9_]/g, '')
    : null;
  const realtor = realtorSlug ? `https://www.realtor.com/realestateandhomes-detail/${realtorSlug}` : null;

  const encoded = encodeURIComponent([address, city, state, zip].filter(Boolean).join(', '));
  const redfin = encoded ? `https://www.redfin.com/search#combined=${encoded}` : null;

  return { zillow, realtor, redfin };
}

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
  { key: 'just_listed', label: 'Just Listed', description: 'Exciting first-look posts with "see it before it\'s gone" energy', icon: Sparkles },
  { key: 'open_house', label: 'Open House', description: 'Event-focused posts with date/time details and personal invitations', icon: DoorOpen },
  { key: 'price_drop', label: 'Price Drop', description: 'Value-driven posts leading with savings and act-now opportunity', icon: TrendingDown },
  { key: 'just_sold', label: 'Just Sold', description: 'Celebration posts that build trust and position you as effective', icon: Trophy },
  { key: 'listing_spotlight', label: 'Listing Spotlight', description: 'Aspirational storytelling focused on lifestyle and neighborhood', icon: Star },
];

// ── Campaign slot configuration — imported from @/lib/assistant/schedulePresets ──

// Available channels are now derived from connected channels at runtime
// (see connectedChannels memo inside ListingCampaignPage)

interface ImagePoolItem {
  id: string;
  displayUrl: string;
  label: string;
}

// ── Main Component ──

interface Props {
  clientId: string;
  initialUrl?: string;
}

export function ListingCampaignPage({ clientId, initialUrl }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: _subscription } = useSubscription();
  const _currentTier = _subscription?.tier ?? 'FREE';
  const _showValueBanner = !isAtOrAboveTier(_currentTier, 'PRO');

  const [step, setStep] = useState<Step>('source');
  const [form, setForm] = useState<PropertyForm>(EMPTY_FORM);
  const [url, setUrl] = useState(initialUrl ?? '');
  const [urlError, setUrlError] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());
  const [campaignType, setCampaignType] = useState<CampaignType>('just_listed');
  const [campaign, setCampaign] = useState<ListingCampaignOutput | null>(null);
  const [dataItemId, setDataItemId] = useState<string | null>(null);
  const [genError, setGenError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [savingCampaign, setSavingCampaign] = useState(false);
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
  const [screenshotRejection, setScreenshotRejection] = useState<string | null>(null);
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
  // Direct upload into campaign — auto-creates a folder in the media library
  const [campaignFolderId, setCampaignFolderId] = useState<string | null>(null);
  const [directUploadCount, setDirectUploadCount] = useState(0);
  const [directUploadTotal, setDirectUploadTotal] = useState(0);
  const directUploadRef = useRef<HTMLInputElement>(null);
  // Progress tracking for sequential listing-image loading (one round-trip per
  // image to upload + auto-tag + score). Surfaced via a floating overlay.
  const [listingLoadCount, setListingLoadCount] = useState(0);
  const [listingLoadTotal, setListingLoadTotal] = useState(0);

  // Mutations
  const urlImport = useListingUrlImport(clientId);
  const generateCampaign = useGenerateListingCampaign(clientId);
  const extractImage = useExtractListingImage(clientId);
  const saveDrafts = useSaveCampaignDrafts(clientId);
  const uploadImages = useUploadCampaignImages(clientId);
  const uploadAsset = useUploadAsset(clientId);
  const uploadAssetFromUrl = useUploadAssetFromUrl(clientId);
  const createFolder = useCreateFolder(clientId);
  const { data: existingFolders } = useFolders(clientId);
  const regeneratePost = useRegeneratePost(clientId);
  const connectionStatus = useChannelConnectionStatus(clientId);

  // Only show channels the user has actually connected
  const connectedChannels = useMemo(() => {
    const channels: string[] = [];
    connectionStatus.forEach((connected, ch) => {
      if (connected) channels.push(ch);
    });
    return channels;
  }, [connectionStatus]);

  // Existing listings for selector — merge PROPERTY + legacy CUSTOM
  const { data: propertyListings } = useProperties(clientId);
  const { data: legacyCustomListings } = useDataItems(clientId, { type: 'CUSTOM', limit: 20 });
  const existingListings = useMemo(() => {
    const props = propertyListings ?? [];
    const legacy = (legacyCustomListings ?? []).filter(
      (c) => (c.dataJson as Record<string, unknown>)?._sourceType != null
    );
    // Dedupe by id in case backfill already migrated some
    const seen = new Set(props.map((p) => p.id));
    return [...props, ...legacy.filter((l) => !seen.has(l.id))];
  }, [propertyListings, legacyCustomListings]);

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
        // Load images from saved listing into media pool
        const d = listing.dataJson as Record<string, unknown>;
        const imgs = Array.isArray(d.images) ? (d.images as string[]) : d.imageUrl ? [d.imageUrl as string] : [];
        if (imgs.length > 0) {
          const nested = d.address as Record<string, unknown> | undefined;
          loadListingImages(imgs, {
            address: (nested?.street ?? d.address) as string | undefined,
            city: (nested?.city ?? d.city) as string | undefined,
          });
        }
        setStep('images');
      }
    }

    const source = searchParams.get('source');
    if (source === 'nearby') {
      try {
        const raw = sessionStorage.getItem('sp_nearby_listing');
        if (raw) {
          sessionStorage.removeItem('sp_nearby_listing');
          const nearbyListing = JSON.parse(raw) as UnifiedListing;
          handlePropertySearchSelect(nearbyListing);
        }
      } catch { /* user lands on normal source step */ }
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
      // Lift nested address fields to flat keys
      if (addr.street != null && addr.street !== '') {
        flat.address = addr.street;
      } else {
        // Remove nested object so it doesn't stringify to "[object Object]"
        delete flat.address;
      }
      if (addr.city != null && addr.city !== '' && flat.city == null) flat.city = addr.city;
      if (addr.state != null && addr.state !== '' && flat.state == null) flat.state = addr.state;
      if (addr.zip != null && addr.zip !== '' && flat.zip == null) flat.zip = addr.zip;
    }
    // Vision API returns address as a flat string like "7712 Stonehill Dr, Anderson Township, OH 45255".
    // Parse it into street / city / state / zip so the form fields populate correctly.
    if (typeof flat.address === 'string' && flat.city == null && flat.state == null && flat.zip == null) {
      const raw = flat.address.trim();
      // Match: "Street, City, ST ZIP" or "Street, City, ST"
      const m = raw.match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i)
             ?? raw.match(/^(.+?),\s*(.+?),\s*([A-Z]{2})$/i);
      if (m) {
        flat.address = m[1].trim();
        flat.city = m[2].trim();
        flat.state = m[3].trim().toUpperCase();
        if (m[4]) flat.zip = m[4].trim();
      }
    }
    // Map CanonicalListing extras: features→highlights, status→listingStatus, title→description fallback
    if (Array.isArray(flat.features) && (flat.features as unknown[]).length > 0 && !flat.highlights) {
      flat.highlights = (flat.features as string[]).join(', ');
    }
    if (flat.status && !flat.listingStatus) {
      flat.listingStatus = flat.status;
    }
    if (flat.title && !flat.description) {
      flat.description = flat.title;
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
        yearBuilt: 'yearBuilt',
        daysOnMarket: 'daysOnMarket',
        listingStatus: 'listingStatus',
        lotSize: 'lotSize',
        listedDate: 'listedDate',
        listingUrl: 'listingUrl',
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

  // Load images from a listing URL import into the candidate image pool.
  // Uploads each image to the media library (with auto-folder + auto-tag),
  // replicating the same pipeline as handleDirectUpload.
  const loadListingImages = useCallback(async (
    images: string[],
    context?: { address?: string; city?: string },
  ) => {
    // Drop social icons / logos / tracking pixels up front so we don't waste
    // an upload + auto-tag round-trip on them and so the progress total
    // reflects only candidate property photos.
    const filteredImages = filterListingImageUrls(images);
    if (filteredImages.length === 0) {
      return;
    }

    // Build a smart folder name from context or current form state.
    const addr = context?.address || form.address;
    const city = context?.city || form.city;
    const folderName = addr
      ? `Campaign — ${addr}${city ? `, ${city}` : ''}`
      : `Listing Campaign ${new Date().toLocaleDateString()}`;

    const addedCandidateIds: string[] = [];

    // Counter rules:
    //   total = initial filter count − bad-so-far. Shrinks when an image is
    //   discovered to be unusable (failed upload, sub-300px icon, fetch error)
    //   so the user sees a target that converges on what they'll actually get.
    //   count = good-so-far. Increments only when a candidate card is added.
    let goodCount = 0;
    let badCount = 0;
    const initialTotal = filteredImages.length;
    setListingLoadCount(0);
    setListingLoadTotal(initialTotal);

    try {
      // Ensure we have a folder (create once, reuse across uploads).
      let folderId = campaignFolderId;
      if (!folderId) {
        const existing = existingFolders?.find((f) => f.name === folderName);
        if (existing) {
          folderId = existing.id;
        } else {
          const folder = await createFolder.mutateAsync(folderName);
          folderId = folder.id;
        }
        setCampaignFolderId(folderId);
      }

      for (let i = 0; i < filteredImages.length; i++) {
        const imgUrl = filteredImages[i];
        let iterSuccess = false;
        try {
          // Try server-side URL upload first; fall back to proxy + blob upload.
          let asset: { id: string; url?: string | null; width?: number | null; height?: number | null; caption?: string | null; altText?: string | null };
          try {
            asset = await uploadAssetFromUrl.mutateAsync({ url: imgUrl, folderId });
          } catch {
            // Fallback: proxy fetch + upload as blob
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imgUrl)}`;
            const proxyRes = await fetch(proxyUrl);
            if (!proxyRes.ok) continue;
            const blob = await proxyRes.blob();
            const fd = new FormData();
            fd.append('file', blob, `listing-image-${i}.jpg`);
            asset = await uploadAsset.mutateAsync({ formData: fd, assetType: 'image', folderId });
          }

          if (!asset.url) continue;

          // Drop anything tiny — icons that slipped past the URL filter
          // (e.g. 64×64 social buttons hosted on a CDN with neutral names).
          const w = asset.width ?? 0;
          const h = asset.height ?? 0;
          if (w > 0 && h > 0 && (w < 300 || h < 300)) continue;

          // Auto-tag — blocking so we get proper labels.
          const savedTags = await autoTagAssetWithResult(clientId, asset.id);
          const matchedLabel = savedTags.find((t) => LABEL_TAGS_SET.has(t as ImageRegionLabel)) as ImageRegionLabel | undefined;

          // Fetch the image as dataUrl for the candidate card display.
          let dataUrl = '';
          try {
            const res = await fetch(asset.url, { mode: 'cors' });
            if (!res.ok) throw new Error('fetch failed');
            const blob = await res.blob();
            dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
          } catch {
            continue; // can't display — skip
          }

          let qualityScore = 50;
          let qualityLabel: QualityLabel = 'fair';
          try {
            const q = await computeImageQuality(dataUrl);
            qualityScore = q.score;
            qualityLabel = q.label;
          } catch { /* best-effort */ }

          const candidateId = `listing_${asset.id}_${Date.now()}`;
          addedCandidateIds.push(candidateId);

          const newLabel = matchedLabel ?? 'other';
          const candidate: CandidateImage = {
            id: candidateId,
            originalUrl: dataUrl,
            cleanedUrl: null,
            enhancedUrl: null,
            cleanedEnhancedUrl: null,
            cleanEnabled: false,
            enhanceEnabled: false,
            cleaning: false,
            enhancing: false,
            label: newLabel,
            description: matchedLabel ? matchedLabel.replace(/_/g, ' ') : '',
            layoutRole: 'gallery',
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
            source: 'manual_crop',
            overlays: [],
            overlayRemoved: false,
            ...EMPTY_CLEANUP_META,
            assetId: asset.id,
          };
          setCandidateImages((prev) => [...prev, candidate]);
          setSelectedImageIds((prev) => {
            const next = new Set(prev);
            next.add(candidateId);
            return next;
          });
          // Update candidate→asset map for save-time dedup
          setCandidateAssetMap((prev) => {
            const next = new Map(prev);
            next.set(candidateId, asset.id);
            return next;
          });
          iterSuccess = true;
        } catch { /* skip failed images */ } finally {
          // `finally` runs even when the body uses `continue`, so this is the
          // only place we need to update progress.
          if (iterSuccess) {
            goodCount += 1;
            setListingLoadCount(goodCount);
          } else {
            badCount += 1;
            setListingLoadTotal(initialTotal - badCount);
          }
        }
      }

      // All uploads done — pick the best hero using LABEL_PRIORITY.
      if (addedCandidateIds.length > 0) {
        setCandidateImages((prev) => {
          const hasHero = prev.some((c) => c.layoutRole === 'hero');
          if (hasHero) return prev;

          let bestId = '';
          let bestPriority = -1;
          for (const c of prev) {
            if (addedCandidateIds.includes(c.id)) {
              const p = LABEL_PRIORITY[c.label] ?? 0;
              if (p > bestPriority) {
                bestPriority = p;
                bestId = c.id;
              }
            }
          }
          if (!bestId) return prev;
          return prev.map((c) =>
            c.id === bestId ? { ...c, layoutRole: 'hero' as const, source: 'hero' as const } : c,
          );
        });
      }
    } catch {
      setSplitNotice('Couldn\u2019t create campaign folder.');
    } finally {
      setListingLoadCount(0);
      setListingLoadTotal(0);
    }
  }, [form.address, form.city, campaignFolderId, existingFolders, createFolder, uploadAssetFromUrl, uploadAsset, clientId]);

  const handleSelectSavedListing = useCallback((item: { id: string; title: string; dataJson?: Record<string, unknown> }) => {
    prefillFromDataItem(item);
    const d = item.dataJson as Record<string, unknown> | undefined;
    const imgs = d
      ? Array.isArray(d.images) ? (d.images as string[]) : d.imageUrl ? [d.imageUrl as string] : []
      : [];
    if (imgs.length > 0) {
      const nested = d?.address as Record<string, unknown> | undefined;
      loadListingImages(imgs, {
        address: (nested?.street ?? d?.address) as string | undefined,
        city: (nested?.city ?? d?.city) as string | undefined,
      });
    }
    setStep('images');
  }, [prefillFromDataItem, loadListingImages]);

  const handlePropertySearchSelect = useCallback((listing: UnifiedListing) => {
    const PROPERTY_TYPE_MAP: Record<string, string> = {
      single_family: 'Single Family',
      condo: 'Condo',
      townhouse: 'Townhouse',
      multi_family: 'Multi-Family',
      land: 'Land',
      commercial: 'Commercial',
    };

    const data: Record<string, unknown> = {
      address: {
        street: listing.street ?? listing.formattedAddress ?? '',
        city: listing.city ?? '',
        state: listing.state ?? '',
        zip: listing.zip ?? '',
      },
      price: listing.price,
      beds: listing.bedrooms,
      baths: listing.bathrooms,
      sqft: listing.sqft,
      propertyType: PROPERTY_TYPE_MAP[listing.propertyType ?? ''] ?? (listing.propertyType ? 'Other' : ''),
      agentName: listing.agent,
      brokerage: listing.office,
      yearBuilt: listing.yearBuilt,
      daysOnMarket: listing.daysOnMarket,
      listingStatus: listing.status,
      lotSize: listing.lotSize,
      listedDate: listing.listedDate,
    };

    const label = `From search: ${listing.formattedAddress ?? listing.street ?? 'Property'}`;
    prefillFromData(data, label);
    setPropertySearchOpen(false);
    setStep('images');
  }, [prefillFromData]);

  const handleUrlImport = useCallback(async () => {
    if (!url.trim()) return;
    setUrlError('');
    try {
      const result = await urlImport.mutateAsync({ url: url.trim() });
      const r = result as unknown as Record<string, unknown>;
      const data = (r.preview ?? r.normalized ?? r) as Record<string, unknown>;
      // Ensure listingUrl is set from the scraped URL if not returned by backend
      if (!data.listingUrl) data.listingUrl = url.trim();
      prefillFromData(data, 'From URL');

      // Load extracted images into the media pool
      const imgs = Array.isArray(data.images) ? (data.images as string[]) : [];
      if (imgs.length > 0) {
        const nested = data.address as Record<string, unknown> | undefined;
        loadListingImages(imgs, {
          address: (nested?.street ?? data.address) as string | undefined,
          city: (nested?.city ?? data.city) as string | undefined,
        });
      }
      setStep('images');
    } catch {
      setUrlError('Could not extract details from that URL. You can enter them manually.');
      setStep('form');
    }
  }, [url, urlImport, prefillFromData, loadListingImages]);

  // Auto-import if initialUrl was provided from dashboard
  useEffect(() => {
    if (initialUrl?.trim()) {
      handleUrlImport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setScreenshotRejection(null);
      setExtractionMeta({
        didSecondPass: false,
        suspicionReason: null,
        containerFound: false,
        extractionSource: 'manual_crop',
        detectedCount: 0,
        segmentation: null,
      });
      // Move to the images step immediately so the user sees a rich
      // loading state instead of sitting on the source screen.
      setStep('images');
      extractImage.mutate(
        { image: base64 },
        {
          onSuccess: (result) => {
            const ext = result.extracted ?? {};
            const listingFields = ['address', 'price', 'beds', 'baths', 'sqft', 'propertyType'];
            const filled = listingFields.filter((k) => ext[k] != null && ext[k] !== '');
            if (filled.length >= 2) {
              prefillFromData(ext, 'From screenshot');
              setExtractionConfidence(result.confidence);
            } else {
              setExtractionConfidence(result.confidence);
              setScreenshotRejection(
                filled.length === 0
                  ? 'This doesn\u2019t appear to be a real estate listing. We couldn\u2019t find any property details like address, price, or bedroom count.'
                  : 'This image has very little listing information. We could only detect ' + filled.join(' and ') + '.',
              );
            }
          },
          onError: () => {
            setScreenshotRejection('We couldn\u2019t analyze this image. Try a clearer screenshot of a listing page.');
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
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);
  const [savedListingFilter, setSavedListingFilter] = useState('');

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
          city: form.city,
          state: form.state,
          zip: form.zip,
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
          yearBuilt: form.yearBuilt,
          daysOnMarket: form.daysOnMarket,
          listingStatus: form.listingStatus,
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
      // Auto-assign images to posts based on imageHint from generation.
      // Uses fuzzy matching (includes) and round-robin fallback so different
      // posts get different images even when labels are identical.
      const rawPosts = result.campaign.posts ?? [];
      const selected = candidateImages.filter((c) => selectedImageIds.has(c.id));
      const autoAssigned = (() => {
        if (selected.length === 0) return rawPosts;
        const usedIds = new Set<string>();
        let rrIndex = 0; // round-robin counter for fallback
        return rawPosts.map((post) => {
          if (post.assignedImageIds && post.assignedImageIds.length > 0) return post;
          // 1. Exact label match
          let match = post.imageHint
            ? selected.find((c) => c.label === post.imageHint && !usedIds.has(c.id))
            : null;
          // 2. Fuzzy match (imageHint contains or is contained in label)
          if (!match && post.imageHint) {
            const hint = post.imageHint.toLowerCase();
            match = selected.find((c) =>
              (c.label.toLowerCase().includes(hint) || hint.includes(c.label.toLowerCase())) && !usedIds.has(c.id),
            );
          }
          // 3. Round-robin fallback — distribute evenly across posts
          if (!match) {
            match = selected[rrIndex % selected.length];
            rrIndex += 1;
          }
          if (match) usedIds.add(match.id);
          return match ? { ...post, assignedImageIds: [match.id] } : post;
        });
      })();
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
    setSavingCampaign(true);

    // Upload selected image crops to Cloudinary/MediaLibrary first (idempotent).
    // Build a stable candidateId→assetId mapping at upload time so per-post
    // assignment survives even if the pool order changes later.
    // Candidates that were already uploaded (via loadListingImages or handleDirectUpload)
    // and have NOT been modified (enhanced/cleaned) are skipped.
    let mediaAssetIds: string[] = uploadedAssetIds;
    let assetMap = new Map(candidateAssetMap);
    const selectedCandidates = candidateImages.filter((c) => selectedImageIds.has(c.id));

    // Pre-populate assetMap from candidates that already have an assetId
    for (const c of selectedCandidates) {
      if (c.assetId && !assetMap.has(c.id)) {
        assetMap.set(c.id, c.assetId);
      }
    }

    // Partition: already-uploaded-and-unmodified vs needs-upload
    const alreadyUploaded = selectedCandidates.filter((c) => c.assetId && !(c.enhanceEnabled || c.cleanEnabled));
    const needsUpload = selectedCandidates.filter((c) => !c.assetId || c.enhanceEnabled || c.cleanEnabled);

    if (mediaAssetIds.length === 0 && needsUpload.length > 0) {
      try {
        // Build folder name for the upload-images endpoint
        const folderName = form.address
          ? `Campaign — ${form.address}${form.city ? `, ${form.city}` : ''}`
          : undefined;
        let folderId = campaignFolderId;
        if (!folderId && folderName) {
          const existing = existingFolders?.find((f) => f.name === folderName);
          if (existing) folderId = existing.id;
        }

        const result = await uploadImages.mutateAsync({
          images: needsUpload.map((c) => ({
            dataUrl: getDisplayUrl(c),
            label: c.label,
            caption: c.description,
            isEnhanced: c.enhanceEnabled,
            qualityScore: c.qualityScore,
            qualityLabel: c.qualityLabel,
          })),
          folderId: folderId ?? undefined,
        });
        // Fire auto-tag for each uploaded asset (non-blocking)
        for (const asset of result.assets) {
          autoTagAssetWithResult(clientId, asset.id).catch(() => {});
        }
        // Update the candidate→asset mapping with newly uploaded assets
        needsUpload.forEach((c, i) => {
          if (result.assets[i]) assetMap.set(c.id, result.assets[i].id);
        });
      } catch (uploadErr) {
        console.error('[campaign] Image upload failed:', uploadErr);
        // Continue save — images can be attached later from the asset library
      }
    }

    // Collect all asset IDs (pre-uploaded + newly uploaded)
    mediaAssetIds = selectedCandidates
      .map((c) => assetMap.get(c.id))
      .filter((id): id is string => !!id);
    setUploadedAssetIds(mediaAssetIds);
    setCandidateAssetMap(assetMap);

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
      const result = await saveDrafts.mutateAsync({
        campaign: editedCampaign,
        propertyData: { address: form.address, city: form.city, state: form.state },
        campaignType,
        dataItemId,
        schedulePreset: addToPlanner ? schedulePreset : undefined,
        addToPlanner,
        mediaAssetIds: mediaAssetIds.length > 0 ? mediaAssetIds : undefined,
      });
      const count = result?.drafts?.length ?? editedCampaign.posts.length;
      const imgNote = mediaAssetIds.length > 0 ? ` with ${mediaAssetIds.length} image${mediaAssetIds.length === 1 ? '' : 's'}` : '';
      const cid = result?.campaignId ?? '';
      if (addToPlanner) {
        setSaveSuccess(`Campaign launched — ${count} posts scheduled over ${schedulePreset} days${imgNote}! Opening Planner…`);
        setTimeout(() => {
          router.push(`/workspaces/${clientId}/planner${cid ? `?campaignId=${cid}` : ''}`);
        }, 1200);
      } else {
        setSaveSuccess(`${count} drafts saved to Content Library${imgNote}! Opening Library…`);
        setTimeout(() => {
          router.push(`/workspaces/${clientId}/planner${cid ? `?campaignId=${cid}` : ''}`);
        }, 1200);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setSaveSuccess(`Failed to save: ${msg}`);
    } finally {
      setSavingCampaign(false);
    }
  }, [campaign, campaignPosts, form, campaignType, dataItemId, saveDrafts, schedulePreset, uploadedAssetIds, candidateAssetMap, candidateImages, selectedImageIds, uploadImages, campaignFolderId, existingFolders, clientId]);

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
          city: form.city,
          state: form.state,
          zip: form.zip,
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
          yearBuilt: form.yearBuilt,
          daysOnMarket: form.daysOnMarket,
          listingStatus: form.listingStatus,
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
      // Merge regen result with existing post — preserve image assignments
      // and any other user-set fields that the backend doesn't return.
      setCampaignPosts((prev) => prev.map((p, i) => {
        if (i !== index) return p;
        const regen = result.post;
        return {
          ...p,
          // Overwrite AI-generated content fields
          body: regen.body ?? p.body,
          bodyAlt: regen.bodyAlt ?? p.bodyAlt,
          subject: regen.subject ?? p.subject,
          hashtags: regen.hashtags ?? p.hashtags,
          cta: regen.cta ?? p.cta,
          imageHint: regen.imageHint ?? p.imageHint,
          hookScore: regen.hookScore ?? p.hookScore,
          angle: regen.angle ?? p.angle,
          // Preserve user-set fields
          assignedImageIds: p.assignedImageIds,
          channel: p.channel,
        };
      }));
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
    setScreenshotRejection(null);
    setSchedulePreset(7);
    setCandidateImages([]);
    setSelectedImageIds(new Set());
    setUploadedAssetIds([]);
    setCandidateAssetMap(new Map());
    setSplitNotice('');
    setGalleryContainer(null);
    setHeroBbox(null);
    setManualCropOpen(false);
    setPropertySearchOpen(false);
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
        <StepIndicator steps={CAMPAIGN_STEPS} currentStep="source" />
        <h1 className="text-2xl font-bold text-white-100 mb-2">Listing Campaign</h1>
        <p className="text-white-40 text-sm mb-8">
          Build a coordinated multi-post campaign for any property. Choose your listing, select images, and generate a complete marketing strategy.
        </p>

        {/* Inline Saved Properties */}
        {existingListings.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-white-60">Your Saved Properties</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white-10 text-white-40">{existingListings.length}</span>
            </div>
            {existingListings.length > 4 && (
              <input
                value={savedListingFilter}
                onChange={(e) => setSavedListingFilter(e.target.value)}
                placeholder="Search by address..."
                className="w-full px-3 py-2 mb-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            )}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {existingListings
                .filter((item) => {
                  if (!savedListingFilter.trim()) return true;
                  const q = savedListingFilter.toLowerCase();
                  const d = item.dataJson as Record<string, unknown>;
                  const addr = typeof d.address === 'string' ? d.address : typeof d.address === 'object' && d.address ? (d.address as Record<string, unknown>).street ?? '' : '';
                  return item.title.toLowerCase().includes(q) || String(addr).toLowerCase().includes(q);
                })
                .map((item) => {
                  const d = item.dataJson as Record<string, unknown>;
                  const thumb = typeof d.imageUrl === 'string' ? d.imageUrl : Array.isArray(d.images) && typeof (d.images as string[])[0] === 'string' ? (d.images as string[])[0] : null;
                  const price = typeof d.price === 'number' ? `$${d.price.toLocaleString()}` : null;
                  const beds = d.beds ?? d.bedrooms;
                  const baths = d.baths ?? d.bathrooms;
                  const sqft = d.sqft;
                  const specs = [beds != null ? `${beds} bd` : null, baths != null ? `${baths} ba` : null, sqft != null ? `${Number(sqft).toLocaleString()} sqft` : null].filter(Boolean).join(' · ');
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectSavedListing(item)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white-5 border border-white-10 hover:border-accent-green-110/40 hover:bg-white-8 text-left transition-all"
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="w-12 h-12 rounded-md object-cover shrink-0 bg-white-10" />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-white-10 flex items-center justify-center shrink-0">
                          <ListChecks className="w-5 h-5 text-white-20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white-80 truncate">{item.title}</p>
                        <p className="text-xs text-white-40 truncate">{[price, specs].filter(Boolean).join(' — ')}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

          {/* Search for Property */}
          <SourceCard
            icon={Search}
            title="Search for Property"
            description="Find by address, city, or ZIP code"
            onClick={() => setPropertySearchOpen(true)}
          />

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
            {/* Loading/rejection states now appear on the images step */}
          </SourceCard>

          {/* Enter Manually */}
          <SourceCard
            icon={Plus}
            title="Enter Manually"
            description="Type in property details from scratch"
            onClick={() => {
              setSourceLabel('Manual entry');
              setStep('images');
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
                          // Load images from saved listing into media pool
                          const d = item.dataJson as Record<string, unknown>;
                          const imgs = Array.isArray(d.images) ? (d.images as string[]) : d.imageUrl ? [d.imageUrl as string] : [];
                          if (imgs.length > 0) {
                            const nested = d.address as Record<string, unknown> | undefined;
                            loadListingImages(imgs, {
                              address: (nested?.street ?? d.address) as string | undefined,
                              city: (nested?.city ?? d.city) as string | undefined,
                            });
                          }
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

        {propertySearchOpen && (
          <PropertySearchModal
            clientId={clientId}
            onSelect={handlePropertySearchSelect}
            onClose={() => setPropertySearchOpen(false)}
          />
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

    // Auto-pick a balanced, high-quality set (target 5–8 images).
    // Strategy: one per label category (prioritized), fill rest by quality score.
    const autoPick = () => {
      const TARGET = 7;
      const sorted = [...candidateImages].sort((a, b) => {
        // Hero first, then by label priority, then by quality
        if (a.layoutRole === 'hero' && b.layoutRole !== 'hero') return -1;
        if (b.layoutRole === 'hero' && a.layoutRole !== 'hero') return 1;
        const pa = LABEL_PRIORITY[a.label] ?? 0;
        const pb = LABEL_PRIORITY[b.label] ?? 0;
        if (pa !== pb) return pb - pa;
        return (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
      });
      const picked = new Set<string>();
      const usedLabels = new Set<string>();
      // Pass 1: best image per category
      for (const c of sorted) {
        if (picked.size >= TARGET) break;
        if (!usedLabels.has(c.label)) {
          usedLabels.add(c.label);
          picked.add(c.id);
        }
      }
      // Pass 2: fill remaining slots by quality
      for (const c of sorted) {
        if (picked.size >= TARGET) break;
        if (!picked.has(c.id)) picked.add(c.id);
      }
      setSelectedImageIds(picked);
    };

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
        // Users can still change the cover photo later with the "Set as cover"
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
        const LABEL_TAGS = new Set<ImageRegionLabel>([
          'exterior', 'kitchen', 'living_room', 'bedroom',
          'bathroom', 'backyard', 'dining_room', 'other',
        ]);
        const matchedLabel = asset.tags?.find((t) => LABEL_TAGS.has(t as ImageRegionLabel)) as ImageRegionLabel | undefined;
        setCandidateImages((prev) => {
          const currentHero = prev.find((c) => c.layoutRole === 'hero');
          const newLabel = matchedLabel ?? 'other';
          const newPriority = LABEL_PRIORITY[newLabel] ?? 0;
          const currentHeroPriority = currentHero ? (LABEL_PRIORITY[currentHero.label] ?? 0) : -1;
          // Promote to hero if there's no hero, or if this image has a higher-priority label.
          const shouldBeHero = !currentHero || newPriority > currentHeroPriority;
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
            label: newLabel,
            description: asset.caption ?? asset.altText ?? (matchedLabel ? matchedLabel.replace(/_/g, ' ') : ''),
            layoutRole: shouldBeHero ? 'hero' : 'gallery',
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
            source: shouldBeHero ? 'hero' : 'manual_crop',
            overlays: [],
            overlayRemoved: false,
            ...EMPTY_CLEANUP_META,
          };
          // If promoting this one to hero, demote the old hero to gallery.
          if (shouldBeHero && currentHero) {
            return prev.map((c) =>
              c.id === currentHero.id ? { ...c, layoutRole: 'gallery' as const } : c,
            ).concat(manual);
          }
          return [...prev, manual];
        });
        setSelectedImageIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      } catch {
        setSplitNotice('Couldn\u2019t load that image from the library.');
      }
    };

    const addManyFromLibrary = async (assets: MediaAsset[]) => {
      const LABEL_TAGS = new Set<ImageRegionLabel>([
        'exterior', 'kitchen', 'living_room', 'bedroom',
        'bathroom', 'backyard', 'dining_room', 'other',
      ]);

      // Generate stable IDs upfront so we can reference them for selection.
      const ts = Date.now();
      const idMap = new Map<string, string>();
      for (let i = 0; i < assets.length; i++) {
        idMap.set(assets[i].id, `library_${assets[i].id}_${ts}_${i}`);
      }

      // Prepare all candidates in parallel (fetch + quality check).
      const prepared = await Promise.all(
        assets.map(async (asset) => {
          if (!asset.url) return null;
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
            } catch { /* best-effort */ }
            const matchedLabel = asset.tags?.find((t) => LABEL_TAGS.has(t as ImageRegionLabel)) as ImageRegionLabel | undefined;
            return { asset, id: idMap.get(asset.id)!, dataUrl, qualityScore, qualityLabel, matchedLabel };
          } catch {
            return null;
          }
        }),
      );

      const valid = prepared.filter(Boolean) as NonNullable<(typeof prepared)[number]>[];
      if (valid.length === 0) return;

      // Collect the IDs we'll add so we can select them.
      const newIds = valid.map((v) => v.id);

      setCandidateImages((prev) => {
        const hasHero = prev.some((c) => c.layoutRole === 'hero');

        // Build new candidates, all as gallery initially.
        const newCandidates: CandidateImage[] = valid.map(({ id, asset, dataUrl, qualityScore, qualityLabel, matchedLabel }) => ({
          id,
          originalUrl: dataUrl,
          cleanedUrl: null,
          enhancedUrl: null,
          cleanedEnhancedUrl: null,
          cleanEnabled: false,
          enhanceEnabled: false,
          cleaning: false,
          enhancing: false,
          label: matchedLabel ?? 'other',
          description: asset.caption ?? asset.altText ?? (matchedLabel ? matchedLabel.replace(/_/g, ' ') : ''),
          layoutRole: 'gallery' as const,
          photoConfidence: 1,
          hasText: false,
          quality: 'bright' as const,
          bbox: { x: 0, y: 0, w: 1, h: 1 },
          pixelWidth: asset.width ?? 0,
          pixelHeight: asset.height ?? 0,
          qualityScore,
          qualityLabel,
          sourcePass: 'manual' as const,
          parentRegionId: null,
          source: 'manual_crop' as const,
          overlays: [],
          overlayRemoved: false,
          ...EMPTY_CLEANUP_META,
        }));

        // If there's no hero yet, pick the best one by label priority.
        if (!hasHero && newCandidates.length > 0) {
          let bestIdx = 0;
          let bestPriority = LABEL_PRIORITY[newCandidates[0].label] ?? 0;
          for (let i = 1; i < newCandidates.length; i++) {
            const p = LABEL_PRIORITY[newCandidates[i].label] ?? 0;
            if (p > bestPriority) {
              bestPriority = p;
              bestIdx = i;
            }
          }
          newCandidates[bestIdx] = { ...newCandidates[bestIdx], layoutRole: 'hero', source: 'hero' };
        }

        return [...prev, ...newCandidates];
      });

      setSelectedImageIds((prev) => {
        const next = new Set(prev);
        for (const id of newIds) next.add(id);
        return next;
      });
    };

    // ── Direct upload handler ──
    // Uploads files to the media library (with auto-folder + auto-tag), then
    // adds them to the campaign candidate pool — same pipeline as the library.
    const handleDirectUpload = async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // Build a smart folder name from the listing address or a fallback.
      const folderName = form.address
        ? `Campaign — ${form.address}${form.city ? `, ${form.city}` : ''}`
        : `Listing Campaign ${new Date().toLocaleDateString()}`;

      setDirectUploadTotal(files.length);
      setDirectUploadCount(0);

      // Track IDs of candidates we add so we can pick the hero at the end.
      const addedCandidateIds: string[] = [];

      try {
        // Ensure we have a folder (create once, reuse across uploads in this session).
        // If a folder with the same name already exists, reuse it instead of
        // trying to create a duplicate (which would 409).
        let folderId = campaignFolderId;
        if (!folderId) {
          const existing = existingFolders?.find((f) => f.name === folderName);
          if (existing) {
            folderId = existing.id;
          } else {
            const folder = await createFolder.mutateAsync(folderName);
            folderId = folder.id;
          }
          setCampaignFolderId(folderId);
        }

        // Upload each file sequentially. Show it in the gallery as soon as it
        // finishes (progressive), but always as 'gallery' — hero is chosen at
        // the end once all tags are known.
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const fd = new FormData();
            fd.append('file', file);
            const isVideo = file.type.startsWith('video/');
            const asset = await uploadAsset.mutateAsync({
              formData: fd,
              assetType: isVideo ? 'video' : 'image',
              folderId,
            });

            if (isVideo || !asset.url) continue; // videos skip candidate pool

            // Auto-tag and await the result so we get proper labels.
            const savedTags = await autoTagAssetWithResult(clientId, asset.id);
            const matchedLabel = savedTags.find((t) => LABEL_TAGS_SET.has(t as ImageRegionLabel)) as ImageRegionLabel | undefined;

            // Fetch the image as dataUrl for the candidate card.
            let dataUrl = '';
            try {
              const res = await fetch(asset.url, { mode: 'cors' });
              if (!res.ok) throw new Error('fetch failed');
              const blob = await res.blob();
              dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
              });
            } catch {
              continue; // can't display — skip
            }

            let qualityScore = 50;
            let qualityLabel: QualityLabel = 'fair';
            try {
              const q = await computeImageQuality(dataUrl);
              qualityScore = q.score;
              qualityLabel = q.label;
            } catch { /* best-effort */ }

            const candidateId = `library_${asset.id}_${Date.now()}`;
            addedCandidateIds.push(candidateId);

            // Add to gallery immediately — NO hero assignment yet.
            const newLabel = matchedLabel ?? 'other';
            const candidate: CandidateImage = {
              id: candidateId,
              originalUrl: dataUrl,
              cleanedUrl: null,
              enhancedUrl: null,
              cleanedEnhancedUrl: null,
              cleanEnabled: false,
              enhanceEnabled: false,
              cleaning: false,
              enhancing: false,
              label: newLabel,
              description: asset.caption ?? asset.altText ?? (matchedLabel ? matchedLabel.replace(/_/g, ' ') : ''),
              layoutRole: 'gallery',
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
              source: 'manual_crop',
              overlays: [],
              overlayRemoved: false,
              ...EMPTY_CLEANUP_META,
              assetId: asset.id,
            };
            setCandidateImages((prev) => [...prev, candidate]);
            setSelectedImageIds((prev) => {
              const next = new Set(prev);
              next.add(candidateId);
              return next;
            });
            setCandidateAssetMap((prev) => {
              const next = new Map(prev);
              next.set(candidateId, asset.id);
              return next;
            });
            setDirectUploadCount(i + 1);
          } catch {
            // Skip individual failures but continue with the rest.
            setDirectUploadCount(i + 1);
          }
        }

        // All uploads done — now pick the best hero from the newly added
        // candidates using LABEL_PRIORITY, but only if there's no hero yet.
        if (addedCandidateIds.length > 0) {
          setCandidateImages((prev) => {
            const hasHero = prev.some((c) => c.layoutRole === 'hero');
            if (hasHero) return prev;

            // Find best candidate among the ones we just added.
            let bestId = '';
            let bestPriority = -1;
            for (const c of prev) {
              if (addedCandidateIds.includes(c.id)) {
                const p = LABEL_PRIORITY[c.label] ?? 0;
                if (p > bestPriority) {
                  bestPriority = p;
                  bestId = c.id;
                }
              }
            }
            if (!bestId) return prev;
            return prev.map((c) =>
              c.id === bestId ? { ...c, layoutRole: 'hero' as const, source: 'hero' as const } : c,
            );
          });
        }
      } catch {
        setSplitNotice('Couldn\u2019t create campaign folder.');
      } finally {
        setDirectUploadCount(0);
        setDirectUploadTotal(0);
        // Reset the file input so re-selecting the same files triggers onChange.
        if (directUploadRef.current) directUploadRef.current.value = '';
      }
    };

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {listingLoadTotal > 0 && (
          <div
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl bg-sp-surface border-2 border-accent-green-110/50 shadow-2xl shadow-accent-green-110/20 ring-4 ring-accent-green-110/10 flex items-center gap-4 backdrop-blur-md min-w-[360px]"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="w-7 h-7 text-accent-green-110 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white-100 tabular-nums leading-none">
                  {listingLoadCount}
                </span>
                <span className="text-base text-white-40 font-medium">/</span>
                <span className="text-xl font-semibold text-white-80 tabular-nums leading-none">
                  {listingLoadTotal}
                </span>
                <span className="text-sm text-white-60 ml-2">listing photos loaded</span>
              </div>
              <div className="mt-2.5 h-2 rounded-full bg-white-10 overflow-hidden">
                <div
                  className="h-full bg-accent-green-110 rounded-full transition-all duration-300"
                  style={{
                    width: `${listingLoadTotal > 0 ? Math.min(100, (listingLoadCount / listingLoadTotal) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setStep('source')}
          className="flex items-center gap-1 text-white-40 text-sm hover:text-white-60 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <StepIndicator steps={CAMPAIGN_STEPS} currentStep="images" />
        <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white-100">
            {extractImage.isPending
              ? 'Extracting property details…'
              : candidateImages.length === 0
                ? 'Select media for your campaign'
                : `${candidateImages.length} media file${candidateImages.length === 1 ? '' : 's'} ready`}
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
              title="Add media from your workspace library"
            >
              <Images className="w-3.5 h-3.5" />
              From library
            </button>
            <button
              onClick={() => directUploadRef.current?.click()}
              disabled={directUploadTotal > 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white-10 text-white-80 hover:bg-white-20 transition-colors font-medium disabled:opacity-50"
              title="Upload files directly — they'll be saved to your media library automatically"
            >
              {directUploadTotal > 0 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {directUploadTotal > 0 ? `Uploading ${directUploadCount}/${directUploadTotal}…` : 'Upload'}
            </button>
            <input
              ref={directUploadRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleDirectUpload(e.target.files)}
            />
            {candidateImages.length > 0 && (
              <>
                {candidateImages.length > 5 && (
                  <button
                    onClick={autoPick}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-green-110/15 text-accent-green-110 hover:bg-accent-green-110/25 transition-colors font-medium"
                    title="Auto-select a balanced set of 5–8 high-quality images across categories"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-pick best
                  </button>
                )}
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
              </>
            )}
          </div>
        </div>

        {/* Upload progress banner — persistent during upload */}
        {directUploadTotal > 0 && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-accent-green-110/5 border border-accent-green-110/15 flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-accent-green-110 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white-80">
                Uploading {directUploadCount} of {directUploadTotal} file{directUploadTotal !== 1 ? 's' : ''}…
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-white-10 overflow-hidden">
                <div
                  className="h-full bg-accent-green-110 rounded-full transition-all duration-300"
                  style={{ width: `${(directUploadCount / directUploadTotal) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-white-40 tabular-nums shrink-0">
              {Math.round((directUploadCount / directUploadTotal) * 100)}%
            </span>
          </div>
        )}

        {/* Extraction loading state — multi-step progress + skeleton cards */}
        {extractImage.isPending && (
          <div className="mb-6">
            <div className="px-4 py-4 rounded-xl bg-accent-green-110/5 border border-accent-green-110/15 mb-5">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-accent-green-110 animate-spin shrink-0" />
                <p className="text-white-80 text-sm font-medium">Extracting property details from screenshot…</p>
              </div>
            </div>
            {/* Skeleton cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border-2 border-white-10">
                  <div className="aspect-square bg-white-5 animate-pulse" />
                  <div className="px-2.5 py-2 bg-white-5 space-y-1.5">
                    <div className="h-3 w-20 bg-white-10 rounded animate-pulse" />
                    <div className="h-2.5 w-14 bg-white-5 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Screenshot rejection warning (shown on images step) */}
        {screenshotRejection && !extractImage.isPending && (
          <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-start gap-2.5 text-orange-300 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{screenshotRejection}</p>
            </div>
            <div className="flex gap-2 mt-3 pl-6">
              <button
                onClick={() => {
                  setScreenshotPreview(null);
                  setScreenshotRejection(null);
                  setExtractionConfidence(null);
                  setStep('source');
                }}
                className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
              >
                Try another screenshot
              </button>
              <button
                onClick={() => setScreenshotRejection(null)}
                className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-200 text-xs font-medium hover:bg-orange-500/30 transition-colors"
              >
                Dismiss and continue
              </button>
            </div>
          </div>
        )}

        {!extractImage.isPending && (
        <p className="text-white-40 text-sm mb-4">
          {candidateImages.length === 0
            ? 'Add photos from your library or use manual crop to get started. Recommended: 5\u20138 images for a strong campaign.'
            : 'Choose which media to use in your campaign. Recommended: 5\u20138 images. Low-quality photos can be enhanced safely.'}
        </p>
        )}
        {candidateImages.length === 0 && screenshotPreview && !extractImage.isPending && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-white-5 border border-white-10 text-white-60 text-sm flex items-start gap-2">
            <Crop className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Use <span className="font-semibold text-white-80">Manual crop</span> above to select photos from your screenshot, or add media from your library.</p>
          </div>
        )}
        {/* Find listing photos links */}
        {!extractImage.isPending && (form.address || form.city) && (() => {
          const { zillow, realtor, redfin } = buildListingSearchUrls(form);
          return (
            <div className="mb-4 px-4 py-3 rounded-lg bg-white-5 border border-white-10 space-y-2">
              <p className="text-xs font-semibold text-white-60 uppercase tracking-wider">Find listing photos</p>
              <p className="text-xs text-white-40">Open the listing page to grab property photos, then upload them here.</p>
              <div className="flex flex-wrap gap-2">
                {form.listingUrl && (
                  <a href={form.listingUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-xs text-accent-green-110 hover:bg-accent-green-110/20 transition-colors font-medium">
                    <ExternalLink className="w-3 h-3" /> Original listing
                  </a>
                )}
                {zillow && (
                  <a href={zillow} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-5 text-xs text-white-60 hover:bg-white-10 hover:text-white-100 transition-colors font-medium border border-white-10">
                    <ExternalLink className="w-3 h-3" /> Search Zillow
                  </a>
                )}
                {realtor && (
                  <a href={realtor} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-5 text-xs text-white-60 hover:bg-white-10 hover:text-white-100 transition-colors font-medium border border-white-10">
                    <ExternalLink className="w-3 h-3" /> Search Realtor.com
                  </a>
                )}
                {redfin && (
                  <a href={redfin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-5 text-xs text-white-60 hover:bg-white-10 hover:text-white-100 transition-colors font-medium border border-white-10">
                    <ExternalLink className="w-3 h-3" /> Search Redfin
                  </a>
                )}
              </div>
            </div>
          );
        })()}
        {/* Skeleton placeholders when no images */}
        {candidateImages.length === 0 && !extractImage.isPending && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border-2 border-dashed border-white-10">
                <div className="aspect-square bg-white/[0.02] flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-white-10" />
                </div>
              </div>
            ))}
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
              {' '}cover: <span className="font-semibold">{candidateImages.filter((c) => c.source === 'hero').length}</span>
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
                title="cover photo"
              >
                <span className="absolute -top-5 left-0 px-1 py-0.5 bg-lime-500 text-[10px] font-semibold text-black rounded">COVER</span>
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

        {/* Pre-compute selected label counts for duplicate warnings */}
        {(() => {
          const selLabelCounts: Record<string, number> = {};
          for (const c of candidateImages) {
            if (selectedImageIds.has(c.id)) {
              selLabelCounts[c.label] = (selLabelCounts[c.label] ?? 0) + 1;
            }
          }
          return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {candidateImages.map((c) => {
            const selected = selectedImageIds.has(c.id);
            const isHero = c.layoutRole === 'hero';
            const confidencePct = Math.round(c.photoConfidence * 100);
            const enhanceReady = hasEnhanced(c);
            const canEnhance =
              (c.qualityLabel === 'low' || c.qualityLabel === 'fair') && !enhanceReady && !c.enhancing;
            const labelOverload = selected && (selLabelCounts[c.label] ?? 0) >= 3;
            return (
              <div
                key={c.id}
                className={cn(
                  'relative group rounded-xl overflow-hidden border-2 transition-all text-left',
                  selected ? 'border-accent-green-110' : 'border-white-10 hover:border-white-30'
                )}
              >
                {/* Thumbnail — click opens the full-size preview modal
                    where the user can enhance / clean / set as cover. Use
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
                      Cover
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
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-white-80 truncate flex-1">{LABEL_DISPLAY[c.label]}</p>
                    {labelOverload && (
                      <span className="shrink-0 text-[9px] text-orange-400/80 font-semibold flex items-center gap-0.5" title={`${selLabelCounts[c.label]} ${LABEL_DISPLAY[c.label]} images selected — consider keeping only the best`}>
                        <AlertTriangle className="w-2.5 h-2.5" />{selLabelCounts[c.label]}×
                      </span>
                    )}
                  </div>
                  {(() => {
                    const caption = c.description || (isHero ? 'Cover photo' : c.layoutRole === 'gallery' ? 'Gallery image' : '');
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
          );
        })()}

        {/* Hide bottom action bar while extraction is running */}
        {!extractImage.isPending && (
        <div className="flex items-center justify-between bg-white-5 border border-white-10 rounded-xl p-4">
          {candidateImages.length > 0 ? (
            <>
              <div>
                <p className="text-white-60 text-sm">
                  <span className="font-semibold text-white-80">{selectedCount}</span> of {candidateImages.length} selected
                </p>
                {selectedCount > 10 && (
                  <p className="text-orange-400/80 text-xs mt-0.5">Consider narrowing to 5–8 for a focused campaign</p>
                )}
                {(() => {
                  // Warn when multiple selected images share the same category.
                  const counts: Record<string, number> = {};
                  for (const c of candidateImages) {
                    if (!selectedImageIds.has(c.id)) continue;
                    counts[c.label] = (counts[c.label] ?? 0) + 1;
                  }
                  const heavy = Object.entries(counts)
                    .filter(([, n]) => n >= 3)
                    .sort((a, b) => b[1] - a[1]);
                  if (heavy.length === 0) return null;
                  const parts = heavy.map(([label, n]) => `${n} ${LABEL_DISPLAY[label as ImageRegionLabel] ?? label}`);
                  return (
                    <p className="text-orange-400/80 text-xs mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Similar images selected: {parts.join(', ')} — consider picking only the best from each category
                    </p>
                  );
                })()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('form')}
                  className="px-4 py-2 rounded-lg bg-white-10 text-white-60 font-medium text-sm hover:bg-white-20 transition-colors"
                >
                  Skip media
                </button>
                <button
                  onClick={() => setStep('form')}
                  className="px-5 py-2 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
                >
                  Use {selectedCount} file{selectedCount === 1 ? '' : 's'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <p className="text-white-40 text-sm">No media added yet — add from your library or skip for now</p>
              <button
                onClick={() => setStep('form')}
                className="px-4 py-2 rounded-lg bg-white-10 text-white-60 font-medium text-sm hover:bg-white-20 transition-colors"
              >
                Continue without media
              </button>
            </div>
          )}
        </div>
        )}

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
            onPickMany={addManyFromLibrary}
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

        <StepIndicator steps={CAMPAIGN_STEPS} currentStep="form" />
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white-100">Confirm Property Details</h1>
          {sourceLabel && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-accent-green-110/15 text-accent-green-110">
              {sourceLabel}
            </span>
          )}
        </div>
        <p className="text-white-40 text-sm mb-6">
          Review and confirm the listing information before generating your campaign.
        </p>

        {/* Listing summary card */}
        {(form.address || form.price) && (
          <div className="mb-6 flex items-center gap-4 p-4 rounded-xl bg-white-5 border border-white-10">
            {(() => {
              const heroImg = candidateImages.find((c) => c.layoutRole === 'hero' && selectedImageIds.has(c.id))
                ?? candidateImages.find((c) => selectedImageIds.has(c.id));
              return heroImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getDisplayUrl(heroImg)} alt="Listing" className="w-20 h-20 rounded-lg object-cover border border-white-10 shrink-0" />
              ) : null;
            })()}
            <div className="flex-1 min-w-0">
              {form.address && <p className="text-sm font-semibold text-white-80 truncate">{form.address}{form.city ? `, ${form.city}` : ''}{form.state ? `, ${form.state}` : ''} {form.zip}</p>}
              <div className="flex items-center gap-3 mt-1 text-xs text-white-40">
                {form.price && <span className="font-semibold text-white-60">${Number(form.price).toLocaleString()}</span>}
                {form.beds && <span>{form.beds} bed</span>}
                {form.baths && <span>{form.baths} bath</span>}
                {form.sqft && <span>{Number(form.sqft).toLocaleString()} sqft</span>}
                {form.propertyType && form.propertyType !== 'Single Family' && <span>{form.propertyType}</span>}
              </div>
            </div>
          </div>
        )}

        {extractImage.isPending && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-accent-green-110/10 border border-accent-green-110/20 text-accent-green-110 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Extracting property details from screenshot — fields will populate automatically…
          </div>
        )}

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
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 [&>option]:bg-sp-bg [&>option]:text-white-100"
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
              placeholder="e.g. Emphasize recent upgrades, target first-time buyers, highlight neighborhood walkability..."
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30 resize-none"
            />
            <p className="text-[10px] text-white-20 mt-1">These notes shape the AI&apos;s messaging strategy — mention what to emphasize, who to target, or what to avoid.</p>
          </div>

          {/* Selected images strip */}
          {candidateImages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
                  Campaign Media ({selectedImageIds.size} of {candidateImages.length} selected)
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
                  <p className="text-xs text-white-30 italic">No media selected</p>
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

        <StepIndicator steps={CAMPAIGN_STEPS} currentStep="campaign" />
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
          <h2 className="text-sm font-semibold text-white-60 mb-1 uppercase tracking-wider">Campaign Type</h2>
          <p className="text-xs text-white-30 mb-3">Sets the tone, messaging angle, and CTAs for every post in the campaign.</p>
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

        {/* Campaign Sequence */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white-60 uppercase tracking-wider">Campaign Sequence</h2>
            <span className="text-xs text-white-30">{campaignSlots.length} post{campaignSlots.length === 1 ? '' : 's'} over {maxDay} day{maxDay === 1 ? '' : 's'}</span>
          </div>
          <p className="text-xs text-white-30 mb-3">
            Define the structure of your campaign. Each slot becomes a post with a unique angle and channel.
          </p>

          {/* Preset selector */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[10px] text-white-25 uppercase tracking-wider mr-1">Preset</span>
            {SEQUENCE_PRESETS.map((preset) => {
              const isActive = preset.slots.length === campaignSlots.length &&
                preset.slots.every((ps, i) => campaignSlots[i]?.label === ps.label && campaignSlots[i]?.campaignDay === ps.campaignDay);
              return (
                <button
                  key={preset.key}
                  onClick={() => setCampaignSlots(preset.slots.map((s) => ({ ...s })))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    isActive
                      ? 'bg-accent-green-110/15 border-accent-green-110/40 text-accent-green-110'
                      : 'bg-white-5 border-white-10 text-white-40 hover:border-white-20 hover:text-white-60',
                  )}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            {/* Mini timeline connector */}
            {campaignSlots.length > 1 && (
              <div className="absolute left-[27px] top-6 bottom-6 w-px bg-white-10" />
            )}

            <div className="space-y-2">
              {campaignSlots.map((slot) => {
                const ChIcon = CHANNEL_ICONS[slot.channel] ?? FileText;
                const purposeHint = slot.purpose || SLOT_PURPOSE_HINTS[slot.label] || '';
                return (
                  <div key={slot.id} className="flex gap-3">
                    {/* Day badge */}
                    <div className="shrink-0 w-14 pt-3 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-accent-green-110/15 flex items-center justify-center z-10 border-2 border-sp-surface">
                        <span className="text-[10px] font-bold text-accent-green-110">D{slot.campaignDay}</span>
                      </div>
                    </div>

                    {/* Slot card */}
                    <div className="flex-1 min-w-0 bg-white-5 border border-white-10 rounded-xl p-3 hover:border-white-20 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Label */}
                          <input
                            value={slot.label}
                            onChange={(e) => updateSlot(slot.id, { label: e.target.value })}
                            className="w-full text-sm font-semibold text-white-80 bg-transparent border-b border-transparent hover:border-white-10 focus:border-accent-green-110 px-0 py-0.5 focus:outline-none transition-colors"
                            placeholder="Post title..."
                          />
                          {/* Purpose hint */}
                          {purposeHint && (
                            <p className="text-[11px] text-white-25 leading-tight">{purposeHint}</p>
                          )}
                          {/* Media hint */}
                          {SLOT_MEDIA_HINTS[slot.label] && (
                            <p className="text-[11px] text-accent-green-110/50 leading-tight flex items-center gap-1">
                              <Images className="w-3 h-3 shrink-0" />
                              {SLOT_MEDIA_HINTS[slot.label]}
                            </p>
                          )}
                          {/* Day + Channel row */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-white-20 uppercase tracking-wider">Day</span>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={slot.campaignDay}
                                onChange={(e) => updateSlot(slot.id, { campaignDay: parseInt(e.target.value) || 1 })}
                                className="w-10 px-1.5 py-0.5 rounded-md bg-white-5 border border-white-10 text-white-80 text-xs text-center focus:outline-none focus:border-accent-green-110"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'w-2 h-2 rounded-full flex-shrink-0',
                                  connectionStatus.get(slot.channel as any) ? 'bg-green-400' : 'bg-yellow-400'
                                )}
                                title={connectionStatus.get(slot.channel as any) ? 'Connected' : 'Not connected'}
                              />
                              <ChIcon className="w-3.5 h-3.5 text-white-20" />
                              <select
                                value={slot.channel}
                                onChange={(e) => updateSlot(slot.id, { channel: e.target.value })}
                                className="px-2 py-0.5 rounded-md bg-white-5 border border-white-10 text-white-60 text-xs focus:outline-none focus:border-accent-green-110"
                              >
                                {connectedChannels.map((ch) => (
                                  <option key={ch} value={ch}>{getChannelLabel(ch as any)}</option>
                                ))}
                              </select>
                            </div>
                            {getChannelRequirementHint(slot.channel as any) && (
                              <p className="text-[10px] text-white-25 mt-0.5">{getChannelRequirementHint(slot.channel as any)}</p>
                            )}
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => removeSlot(slot.id)}
                          disabled={campaignSlots.length <= 1}
                          className="shrink-0 p-1.5 rounded-md text-white-20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Remove this slot"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pl-[68px]">
            <button
              onClick={addSlot}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white-10 text-white-40 text-xs font-medium hover:border-white-20 hover:text-white-60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Post
            </button>
          </div>
        </div>

        {/* Generation preview */}
        <div className="bg-accent-green-110/5 border border-accent-green-110/15 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-accent-green-110 mt-0.5 shrink-0" />
            <div>
              <p className="text-white-60 text-xs">
                AI will generate <strong className="text-white-80">{campaignSlots.length} coordinated post{campaignSlots.length === 1 ? '' : 's'}</strong> across{' '}
                <strong className="text-white-80">{uniqueChannels.join(', ')}</strong>{' '}
                — each with a unique angle, body copy, hashtags, and CTA.
              </p>
              <p className="text-white-30 text-[11px] mt-1">
                You can edit everything after generation. Images are assigned in the next step.
              </p>
            </div>
          </div>
        </div>

        {/* Channel connection warnings */}
        {(() => {
          const disconnected = uniqueChannels.filter((ch) => !connectionStatus.get(ch as any));
          if (disconnected.length === 0) return null;
          return (
            <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs mb-4">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                {disconnected.map((ch) => getChannelLabel(ch as any)).join(', ')}{' '}
                {disconnected.length === 1 ? 'is' : 'are'} not connected.
                You can still generate, but posts won&apos;t be publishable until you connect.
              </span>
            </div>
          );
        })()}

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

    // Group posts by campaign day for timeline headers
    const dayGroups: { day: number; startIdx: number }[] = [];
    let lastDay = -1;
    posts.forEach((p, i) => {
      if (p.campaignDay !== lastDay) {
        dayGroups.push({ day: p.campaignDay, startIdx: i });
        lastDay = p.campaignDay;
      }
    });

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
              {addressLine} &middot; {posts.length} posts over {Math.max(...posts.map((p) => p.campaignDay))} days
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

        {/* Post-campaign value banner for free/starter users */}
        {_showValueBanner && (
          <div className="mb-6">
            <UpgradeTriggerBanner
              triggerSource="post_campaign_value"
              headline="This would normally take 45+ minutes. SquadPitch did it in seconds."
              subtext={`${posts.length} posts, ${Math.max(...posts.map((p) => p.campaignDay))} days of content — ready to go.`}
              cta="Unlock unlimited campaigns"
              targetTier="PRO"
              clientId={clientId}
            />
          </div>
        )}

        {/* Image Pool */}
        {imagePool.length > 0 && (
          <div className="mb-6 bg-white-5 border border-white-10 rounded-xl p-4">
            <p className="text-xs font-medium text-white-40 uppercase tracking-wider mb-3">
              Property Photos ({imagePool.length})
            </p>
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {imagePool.map((img) => (
                <div key={img.id} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.displayUrl}
                    alt={img.label}
                    className="w-24 h-24 rounded-lg object-cover border border-white-10"
                  />
                  <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white-80 font-medium">
                    {img.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign Timeline */}
        <div className="relative mb-8">
          {/* Timeline connector line */}
          {posts.length > 1 && (
            <div className="absolute left-[23px] top-8 bottom-8 w-px bg-white-10" />
          )}

          <div className="space-y-0">
            {posts.map((post, idx) => {
              // Show day header when day changes
              const showDayHeader = idx === 0 || post.campaignDay !== posts[idx - 1].campaignDay;
              return (
                <div key={`post-${idx}-${post.campaignDay}`}>
                  {showDayHeader && (
                    <div className="flex items-center gap-3 py-3 pl-1">
                      <div className="w-11 h-7 rounded-full bg-accent-green-110/15 flex items-center justify-center z-10">
                        <span className="text-xs font-bold text-accent-green-110">D{post.campaignDay}</span>
                      </div>
                      <span className="text-xs font-medium text-white-40 uppercase tracking-wider">
                        Day {post.campaignDay}
                      </span>
                    </div>
                  )}
                  <div className="pl-12">
                    <CampaignPostCard
                      post={post}
                      index={idx}
                      totalPosts={posts.length}
                      onUpdate={updatePost}
                      onRegenerate={handleRegeneratePost}
                      isRegenerating={regeneratingIndex === idx}
                      imagePool={imagePool}
                      availableChannels={connectedChannels}
            />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campaign Summary + Schedule + Actions */}
        <div className="bg-white-5 border border-white-10 rounded-xl p-5 space-y-4">
          {/* Campaign summary */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-white-40">
            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /><span className="font-semibold text-white-60">{posts.length}</span> posts</span>
            <span className="flex items-center gap-1.5"><CalendarPlus className="w-3.5 h-3.5" /><span className="font-semibold text-white-60">{Math.max(...posts.map((p) => p.campaignDay), 0)}</span> day campaign</span>
            {(() => {
              const channels = Array.from(new Set(posts.map((p) => p.channel)));
              return <span>{channels.join(', ')}</span>;
            })()}
            {imagePool.length > 0 && <span><span className="font-semibold text-white-60">{imagePool.length}</span> media files</span>}
          </div>

          {/* Schedule preset selector */}
          <div className="pt-3 border-t border-white-10">
            <p className="text-xs font-medium text-white-40 uppercase tracking-wider mb-2">Scheduling Window</p>
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
                  {days} days
                </button>
              ))}
              <span className="text-xs text-white-30 ml-2">
                Posts spread evenly across {schedulePreset} days from start date
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-white-10">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <button
                  onClick={() => handleSaveDrafts(false)}
                  disabled={savingCampaign}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white-10 text-white-60 font-semibold text-sm hover:bg-white-20 transition-colors disabled:opacity-50"
                >
                  {savingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingCampaign ? 'Saving…' : 'Save as Drafts'}
                </button>
                <p className="text-[10px] text-white-20 mt-1">Save to library for review</p>
              </div>
              <div className="text-center">
                <button
                  onClick={() => handleSaveDrafts(true)}
                  disabled={savingCampaign}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50"
                >
                  {savingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                  {savingCampaign ? 'Launching…' : 'Launch Campaign'}
                </button>
                <p className="text-[10px] text-white-20 mt-1">Add to planner and schedule</p>
              </div>
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
  availableChannels,
}: {
  post: CampaignPost;
  index: number;
  totalPosts: number;
  onUpdate: (index: number, updates: Partial<CampaignPost>) => void;
  onRegenerate: (index: number) => void;
  isRegenerating: boolean;
  imagePool?: ImagePoolItem[];
  availableChannels: string[];
}) {
  const [copied, setCopied] = useState(false);
  const [showAlt, setShowAlt] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [regenDone, setRegenDone] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const displayBody = showAlt && post.bodyAlt ? post.bodyAlt : post.body;
  const ChannelIcon = CHANNEL_ICONS[post.channel] ?? FileText;
  const assignedImages = (post.assignedImageIds ?? [])
    .map((id) => imagePool.find((p) => p.id === id))
    .filter((img): img is ImagePoolItem => !!img);
  const primaryImage = assignedImages[0] ?? null;

  // Auto-resize textarea
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = 'auto';
      bodyRef.current.style.height = `${bodyRef.current.scrollHeight}px`;
    }
  }, [displayBody, showAlt]);

  // Flash green on regen success
  const prevRegenerating = useRef(isRegenerating);
  useEffect(() => {
    if (prevRegenerating.current && !isRegenerating) {
      setRegenDone(true);
      const t = setTimeout(() => setRegenDone(false), 1500);
      return () => clearTimeout(t);
    }
    prevRegenerating.current = isRegenerating;
  }, [isRegenerating]);

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

  const handleHashtagChange = (text: string) => {
    const tags = text
      .split(/[,]+/)
      .map((t) => t.replace(/^#/, '').trim())
      .filter(Boolean);
    onUpdate(index, { hashtags: tags });
  };

  return (
    <div className={cn(
      'relative bg-white-5 border rounded-xl overflow-hidden transition-all mb-3',
      regenDone ? 'border-accent-green-110/50' : 'border-white-10',
    )}>
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white-10">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ChannelIcon className="w-4 h-4 text-white-30 shrink-0" />
          <p className="text-sm font-semibold text-white-80 truncate">{post.label}</p>
        </div>
        <select
          value={post.channel}
          onChange={(e) => onUpdate(index, { channel: e.target.value as CampaignPost['channel'] })}
          style={{ colorScheme: 'dark' }}
          className="text-xs bg-white-5 border border-white-10 text-white-60 rounded-lg px-2 py-1.5 focus:outline-none focus:border-accent-green-110 shrink-0 [&>option]:bg-sp-card [&>option]:text-white-80"
        >
          {availableChannels.map((ch) => (
            <option key={ch} value={ch}>{getChannelLabel(ch as any)}</option>
          ))}
        </select>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-white-30 text-xs hover:text-white-60 hover:bg-white-10 transition-colors shrink-0"
          title="Copy full post text"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => onRegenerate(index)}
          disabled={isRegenerating}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white-30 text-xs hover:text-white-60 hover:bg-white-10 transition-colors disabled:opacity-50 shrink-0"
          title="Regenerate this post only"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRegenerating && 'animate-spin')} />
        </button>
      </div>

      <div className="p-4">
        {/* ─── Image Section ─── */}
        {imagePool.length > 0 && (
          <div className="mb-4">
            {primaryImage ? (
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(assignedImages[carouselIdx] ?? primaryImage).displayUrl}
                  alt={(assignedImages[carouselIdx] ?? primaryImage).label}
                  className="w-full h-48 rounded-lg object-cover"
                />
                {/* Carousel navigation */}
                {assignedImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCarouselIdx((i) => (i - 1 + assignedImages.length) % assignedImages.length)}
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-sm hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setCarouselIdx((i) => (i + 1) % assignedImages.length)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-sm hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
                      {assignedImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCarouselIdx(i)}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full transition-colors',
                            i === carouselIdx ? 'bg-white' : 'bg-white/40',
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <button
                    onClick={() => setShowImagePicker(!showImagePicker)}
                    className="px-3 py-1.5 rounded-lg bg-white/90 text-gray-900 text-xs font-medium hover:bg-white transition-colors pointer-events-auto"
                  >
                    Change Image
                  </button>
                </div>
                <span className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white-80 font-medium">
                  {(assignedImages[carouselIdx] ?? primaryImage).label}
                </span>
                {assignedImages.length > 1 && (
                  <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white-80">
                    {carouselIdx + 1}/{assignedImages.length}
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowImagePicker(!showImagePicker)}
                className="w-full h-36 rounded-lg border-2 border-dashed border-white-10 hover:border-accent-green-110/30 hover:bg-accent-green-110/5 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <Images className="w-6 h-6 text-white-20 group-hover:text-accent-green-110/60 transition-colors" />
                <span className="text-xs text-white-30 group-hover:text-white-60 transition-colors font-medium">Choose image for this post</span>
                {post.imageHint && (
                  <span className="text-[10px] text-white-20">Suggested: {post.imageHint}</span>
                )}
              </button>
            )}

            {/* AI image suggestion */}
            {post.imageHint && !primaryImage && (
              <button
                onClick={() => {
                  const match = imagePool.find((p) => p.label.toLowerCase().includes(post.imageHint!.toLowerCase()));
                  if (match) onUpdate(index, { assignedImageIds: [...(post.assignedImageIds ?? []), match.id] });
                }}
                className="flex items-center gap-1.5 mt-2 text-xs text-blue-300/80 hover:text-blue-300 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Suggested: &ldquo;{post.imageHint}&rdquo;
              </button>
            )}

            {/* Image picker grid */}
            {showImagePicker && (
              <div className="mt-2 flex items-center gap-2 flex-wrap p-2 bg-white-5 rounded-lg border border-white-10">
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
                        'relative shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                        isAssigned ? 'border-accent-green-110 ring-1 ring-accent-green-110/30' : 'border-transparent hover:border-white-20',
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.displayUrl} alt={img.label} className="w-16 h-16 object-cover" />
                      {isAssigned && (
                        <div className="absolute inset-0 bg-accent-green-110/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-accent-green-110" />
                        </div>
                      )}
                      <span className="absolute bottom-0 left-0 right-0 text-[8px] px-1 py-0.5 bg-black/70 text-white-80 truncate text-center">
                        {img.label}
                      </span>
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowImagePicker(false)}
                  className="text-[10px] text-white-30 hover:text-white-60 px-2 py-1"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── A/B Toggle ─── */}
        {post.bodyAlt && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center bg-white-5 rounded-lg p-0.5 border border-white-10">
              <button
                onClick={() => setShowAlt(false)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold transition-colors',
                  !showAlt ? 'bg-accent-green-110 text-sp-surface' : 'text-white-30 hover:text-white-60',
                )}
              >
                Version A
              </button>
              <button
                onClick={() => setShowAlt(true)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold transition-colors',
                  showAlt ? 'bg-accent-green-110 text-sp-surface' : 'text-white-30 hover:text-white-60',
                )}
              >
                Version B
              </button>
            </div>
            <span className="text-[10px] text-white-20">Compare creative variations</span>
            {post.hookScore != null && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full ml-auto font-medium',
                  post.hookScore >= 70 ? 'bg-green-500/10 text-green-400' :
                  post.hookScore >= 40 ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-red-500/10 text-red-400',
                )}
              >
                Hook score: {post.hookScore}
              </span>
            )}
          </div>
        )}

        {/* ─── Subject (email posts) ─── */}
        {post.subject && (
          <input
            value={post.subject}
            onChange={(e) => onUpdate(index, { subject: e.target.value })}
            placeholder="Subject line..."
            className="w-full text-white-100 font-semibold text-sm bg-transparent border-b border-transparent hover:border-white-10 focus:border-accent-green-110 px-0 py-1 mb-2 focus:outline-none transition-colors"
          />
        )}

        {/* ─── Body (always editable) ─── */}
        <textarea
          ref={bodyRef}
          value={showAlt && post.bodyAlt !== undefined ? post.bodyAlt : post.body}
          onChange={(e) => {
            if (showAlt && post.bodyAlt !== undefined) {
              onUpdate(index, { bodyAlt: e.target.value });
            } else {
              onUpdate(index, { body: e.target.value });
            }
          }}
          className="w-full text-white-80 text-sm leading-relaxed bg-transparent border border-transparent hover:border-white-10 focus:border-accent-green-110/50 rounded-lg px-0 py-1 resize-none focus:outline-none transition-colors min-h-[80px]"
        />

        {/* ─── Metadata row: Hashtags + CTA ─── */}
        <div className="mt-2 pt-2 border-t border-white-5 space-y-2">
          {/* Hashtags as editable chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(post.hashtags ?? []).map((h, i) => (
              <span key={`${h}-${i}`} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-accent-green-110/10 text-accent-green-110/80 text-xs">
                #{h}
                <button
                  onClick={() => {
                    const next = [...(post.hashtags ?? [])];
                    next.splice(i, 1);
                    onUpdate(index, { hashtags: next });
                  }}
                  className="ml-0.5 text-accent-green-110/40 hover:text-accent-green-110 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              placeholder="+ tag"
              className="text-xs text-white-40 bg-transparent border-none focus:outline-none w-16 placeholder:text-white-20"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const val = e.currentTarget.value.replace(/^#/, '').trim();
                  if (val) {
                    onUpdate(index, { hashtags: [...(post.hashtags ?? []), val] });
                    e.currentTarget.value = '';
                  }
                }
              }}
              onBlur={(e) => {
                const val = e.currentTarget.value.replace(/^#/, '').trim();
                if (val) {
                  onUpdate(index, { hashtags: [...(post.hashtags ?? []), val] });
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>

          {/* CTA inline */}
          {(post.cta || true) && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white-20 uppercase tracking-wider shrink-0">CTA</span>
              <input
                value={post.cta}
                onChange={(e) => onUpdate(index, { cta: e.target.value })}
                placeholder="Call to action..."
                className="flex-1 text-xs text-white-60 bg-transparent border-b border-transparent hover:border-white-10 focus:border-accent-green-110 px-0 py-0.5 focus:outline-none transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* Regenerating overlay */}
      {isRegenerating && (
        <div className="absolute inset-0 bg-sp-surface/50 flex items-center justify-center rounded-xl">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white-5 border border-white-10">
            <Loader2 className="w-4 h-4 animate-spin text-accent-green-110" />
            <span className="text-xs text-white-60">Regenerating...</span>
          </div>
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
            <h2 className="text-white-100 font-semibold text-base">Select a photo from the screenshot</h2>
            <p className="text-white-40 text-xs">Click and drag a rectangle around any photo you want to use. Each crop becomes a new campaign media asset.</p>
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
                  {ec.isHero ? `cover` : `#${idx + 1}`}
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
              ? `Selection ready — click "Add crop" to add this as a campaign image`
              : 'Draw a rectangle over a photo to select it'}
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
  const caption = candidate.description || (isHero ? 'Cover photo' : 'Image preview');
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
                Cover
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
              title={isHero ? 'This image is already the cover photo' : 'Use this as the cover photo'}
            >
              <Star className="w-3.5 h-3.5" />
              {isHero ? 'Cover photo' : 'Set as cover'}
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
// listing campaign as candidate tiles. Supports folder browsing, tag
// filtering, and multi-select / batch add.

interface MediaLibraryPickerModalProps {
  clientId: string;
  onClose: () => void;
  onPick: (asset: MediaAsset) => void | Promise<void>;
  onPickMany: (assets: MediaAsset[]) => void | Promise<void>;
}

const TAG_COLORS: Record<string, string> = {
  exterior: 'bg-blue-500/20 text-blue-300',
  kitchen: 'bg-amber-500/20 text-amber-300',
  living_room: 'bg-emerald-500/20 text-emerald-300',
  bedroom: 'bg-purple-500/20 text-purple-300',
  bathroom: 'bg-cyan-500/20 text-cyan-300',
  backyard: 'bg-lime-500/20 text-lime-300',
  dining_room: 'bg-orange-500/20 text-orange-300',
};

function MediaLibraryPickerModal({ clientId, onClose, onPick, onPickMany }: MediaLibraryPickerModalProps) {
  // Folder / tag filter state
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // null = All
  const [activeTag, setActiveTag] = useState<string>(''); // '' = no tag filter
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [batchAdding, setBatchAdding] = useState(false);

  // Data queries
  const { data: assets, isLoading: assetsLoading } = useAssets(clientId, {
    status: 'READY',
    ...(activeFolderId === '__unfiled__' ? { folderId: 'UNFILED' } : activeFolderId ? { folderId: activeFolderId } : {}),
    ...(activeTag ? { tag: activeTag } : {}),
  });
  const { data: folders } = useFolders(clientId);
  const { data: tagDefaults } = useAssetTagDefaults(clientId);

  // Collect unique tags across visible assets + defaults
  const availableTags = (() => {
    const set = new Set<string>(tagDefaults ?? []);
    assets?.forEach((a) => a.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  })();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeFolderId, activeTag]);

  const handlePick = async (asset: MediaAsset) => {
    setPickingId(asset.id);
    try {
      await onPick(asset);
    } finally {
      setPickingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!assets) return;
    const selected = assets.filter((a) => selectedIds.has(a.id));
    if (selected.length === 0) return;
    setBatchAdding(true);
    try {
      await onPickMany(selected);
    } finally {
      setBatchAdding(false);
      setSelectedIds(new Set());
    }
  };

  const handleAddAllFolder = async () => {
    if (!assets || assets.length === 0) return;
    setBatchAdding(true);
    try {
      await onPickMany(assets);
    } finally {
      setBatchAdding(false);
    }
  };

  const selectAll = () => {
    if (!assets) return;
    setSelectedIds(new Set(assets.map((a) => a.id)));
  };

  const isSpecificFolder = activeFolderId !== null && activeFolderId !== '__unfiled__';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl mx-4 bg-sp-surface rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* Folder tabs */}
        <div className="px-4 pt-3 pb-1 shrink-0 space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {/* All pill */}
            <button
              type="button"
              onClick={() => setActiveFolderId(null)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                activeFolderId === null
                  ? 'bg-accent-green-110/20 text-accent-green-110 border border-accent-green-110/40'
                  : 'bg-white-5 text-white-60 hover:bg-white-10',
              )}
            >
              <FolderOpen className="w-3 h-3" />
              All
            </button>
            {/* Unfiled pill */}
            <button
              type="button"
              onClick={() => setActiveFolderId('__unfiled__')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                activeFolderId === '__unfiled__'
                  ? 'bg-accent-green-110/20 text-accent-green-110 border border-accent-green-110/40'
                  : 'bg-white-5 text-white-60 hover:bg-white-10',
              )}
            >
              Unfiled
            </button>
            {/* Folder pills */}
            {folders?.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setActiveFolderId(folder.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                  activeFolderId === folder.id
                    ? 'bg-accent-green-110/20 text-accent-green-110 border border-accent-green-110/40'
                    : 'bg-white-5 text-white-60 hover:bg-white-10',
                )}
              >
                <FolderOpen className="w-3 h-3" />
                {folder.name} ({folder.assetCount})
              </button>
            ))}
          </div>

          {/* Tag filter pills */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="w-3 h-3 text-white-30 shrink-0" />
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag((prev) => (prev === tag ? '' : tag))}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors',
                    activeTag === tag
                      ? 'ring-1 ring-accent-green-110 ' + (TAG_COLORS[tag] ?? 'bg-white-10 text-white-80')
                      : TAG_COLORS[tag] ?? 'bg-white-10 text-white-60 hover:bg-white-15',
                  )}
                >
                  {tag.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}

          {/* Add entire folder button */}
          {isSpecificFolder && assets && assets.length > 0 && (
            <div className="flex items-center">
              <button
                type="button"
                disabled={batchAdding}
                onClick={handleAddAllFolder}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-accent-green-110 text-sp-surface text-xs font-semibold hover:bg-accent-green-110/90 transition-colors disabled:opacity-60"
              >
                {batchAdding ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                Add all {assets.length} file{assets.length === 1 ? '' : 's'}
              </button>
            </div>
          )}
        </div>

        {/* Grid area */}
        <div className="flex-1 overflow-auto p-4">
          {assetsLoading ? (
            <div className="flex items-center justify-center py-12 text-white-40 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading library…
            </div>
          ) : !assets || assets.length === 0 ? (
            <div className="text-center py-12 text-white-40 text-sm">
              <Images className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {activeFolderId || activeTag ? (
                <>
                  <p>No media matches the current filters.</p>
                  <p className="text-xs mt-1 text-white-30">Try a different folder or tag.</p>
                </>
              ) : (
                <>
                  <p>No media in the library yet.</p>
                  <p className="text-xs mt-1 text-white-30">Upload or generate media first from the Assets page.</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {assets.map((asset) => {
                const busy = pickingId === asset.id;
                const selected = selectedIds.has(asset.id);
                return (
                  <div
                    key={asset.id}
                    className={cn(
                      'group relative aspect-square rounded-lg overflow-hidden bg-black/40 border-2 transition-colors',
                      selected ? 'border-accent-green-110' : 'border-white-10 hover:border-white-20',
                      busy && 'opacity-60 cursor-wait',
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(asset.id); }}
                      className={cn(
                        'absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded flex items-center justify-center transition-colors',
                        selected
                          ? 'bg-accent-green-110 text-sp-surface'
                          : 'bg-black/50 text-white-40 opacity-0 group-hover:opacity-100',
                      )}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>

                    {/* Image */}
                    <button
                      type="button"
                      disabled={busy || !asset.url}
                      onClick={() => handlePick(asset)}
                      className="w-full h-full"
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
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
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

                    {/* Tag chips at bottom */}
                    {asset.tags && asset.tags.length > 0 && (
                      <div className="absolute bottom-1 left-1 right-6 flex items-center gap-0.5 pointer-events-none">
                        {asset.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              'px-1.5 py-px rounded-full text-[9px] font-medium truncate',
                              TAG_COLORS[tag] ?? 'bg-white-10 text-white-60',
                            )}
                          >
                            {tag.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {asset.tags.length > 2 && (
                          <span className="px-1 py-px rounded-full text-[9px] text-white-40 bg-white-10">
                            +{asset.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-3 border-t border-white-10 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            {assets && assets.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={selectedIds.size === (assets?.length ?? 0) ? () => setSelectedIds(new Set()) : selectAll}
                  className="text-white-40 hover:text-white-80 transition-colors"
                >
                  {selectedIds.size === (assets?.length ?? 0) ? 'Clear' : 'Select all'}
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-white-30">
                    {selectedIds.size} selected
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-xs text-white-40 hover:text-white-80 transition-colors"
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  disabled={batchAdding}
                  onClick={handleAddSelected}
                  className="px-4 py-1.5 rounded-lg bg-accent-green-110 text-sp-surface text-xs font-semibold hover:bg-accent-green-110/90 transition-colors disabled:opacity-60 flex items-center gap-1"
                >
                  {batchAdding ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Add {selectedIds.size} selected
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-white-10 text-white-80 text-xs font-medium hover:bg-white-20 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
