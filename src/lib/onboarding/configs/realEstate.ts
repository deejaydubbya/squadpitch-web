import type { OnboardingConfig, REContentGoal } from '../types';

export const realEstateConfig: OnboardingConfig = {
  industryKey: 'real_estate',
  useREFlow: true,
  starters: [
    // Sub-starters used after listing source selection
    {
      method: 'website',
      label: 'Website URL',
      description: "We'll analyze your real estate site.",
      icon: 'Globe',
      inputType: 'url',
      placeholder: 'https://youragentsite.com',
    },
    {
      method: 'description',
      label: 'Describe it',
      description: 'Tell us about the listing or your business.',
      icon: 'MessageSquare',
      inputType: 'textarea',
      placeholder: 'Describe the property details, location, features...',
    },
    {
      method: 'documents',
      label: 'Upload documents',
      description: 'Upload listing sheets, PDFs, or marketing materials.',
      icon: 'FileText',
      inputType: 'none',
    },
    {
      method: 'scratch',
      label: 'Enter manually',
      description: 'Fill in the details yourself.',
      icon: 'Sparkles',
      inputType: 'none',
    },
  ],
  enrichmentCards: [
    {
      key: 'license',
      label: 'License lookup',
      description: 'Required for compliant real estate marketing.',
      icon: 'Shield',
      cardType: 'source_license',
    },
    {
      key: 'crm',
      label: 'CRM import',
      description: 'Turn contacts into targeted campaigns.',
      icon: 'Database',
      cardType: 'source_crm',
    },
    {
      key: 'additional_urls',
      label: 'Add more URLs',
      description: 'Improve content accuracy with more sources.',
      icon: 'Globe',
      cardType: 'source_input',
      payload: { inputMode: 'url', placeholder: 'https://...' },
    },
    {
      key: 'add_description',
      label: 'Add more details',
      description: 'Improve content accuracy with your own words.',
      icon: 'MessageSquare',
      cardType: 'source_input',
      payload: { inputMode: 'textarea', placeholder: 'Tell us more about your real estate business...' },
    },
    {
      key: 'add_photos',
      label: 'Add photos',
      description: 'Better photos mean more engaging posts.',
      icon: 'Image',
      cardType: 'source_input',
      payload: { inputMode: 'file', accept: 'image/*' },
    },
    {
      key: 'channels',
      label: 'Connect channels',
      description: 'Enable publishing and scheduling.',
      icon: 'Zap',
      cardType: 'channel_connect',
    },
  ],
  welcomeMessage: "Let's build your real estate content system. What do you want to start with?",
  analysisMessage: "Analyzing — I'll extract your brand, listings, and market data.",
  valueMessage: "Here's what I created! Take a look.",
};

// ── RE intent definitions ────────────────────────────────────────────────

export interface REIntentDef {
  intent: 'listing' | 'business' | 'just_create';
  label: string;
  description: string;
  icon: string;
  emphasized?: boolean;
}

export const RE_INTENTS: REIntentDef[] = [
  {
    intent: 'listing',
    label: 'Start with a listing',
    description: 'Create content for a specific property — this is the fastest way to wow moment.',
    icon: 'Home',
    emphasized: true,
  },
  {
    intent: 'business',
    label: 'Promote my real estate business',
    description: 'Set up your brand and generate agent marketing content.',
    icon: 'Building2',
  },
  {
    intent: 'just_create',
    label: 'Just create content',
    description: 'Skip setup and start making real estate posts right away.',
    icon: 'Sparkles',
  },
];

// ── Listing source definitions ───────────────────────────────────────────

export interface REListingSourceDef {
  method: 'single_listing_url' | 'listing_feed_url' | 'description' | 'manual_form';
  label: string;
  description: string;
  icon: string;
}

export const RE_LISTING_SOURCES: REListingSourceDef[] = [
  {
    method: 'single_listing_url',
    label: 'Single listing URL',
    description: "Paste a property page and we'll extract the details and photos.",
    icon: 'Link',
  },
  {
    method: 'listing_feed_url',
    label: 'Listing feed / IDX page',
    description: 'Paste a page with multiple listings and choose which properties to use.',
    icon: 'LayoutList',
  },
  {
    method: 'description',
    label: 'Paste listing details',
    description: 'Copy/paste MLS or listing text.',
    icon: 'FileText',
  },
  {
    method: 'manual_form',
    label: 'Enter manually',
    description: 'Fill in property details yourself.',
    icon: 'Pencil',
  },
];

// ── Content goal definitions ─────────────────────────────────────────────

export interface REContentGoalDef {
  goal: REContentGoal;
  label: string;
  description: string;
  icon: string;
}

export const RE_CONTENT_GOALS: REContentGoalDef[] = [
  { goal: 'attract_sellers', label: 'Attract sellers', description: 'Get more listing appointments', icon: 'TrendingUp' },
  { goal: 'attract_buyers', label: 'Attract buyers', description: 'Connect with motivated buyers', icon: 'Users' },
  { goal: 'build_authority', label: 'Build authority', description: 'Position yourself as the local expert', icon: 'Award' },
  { goal: 'stay_top_of_mind', label: 'Stay top-of-mind', description: 'Keep your sphere engaged', icon: 'Heart' },
  { goal: 'mixed', label: 'A mix of everything', description: 'Balanced content across all goals', icon: 'Sparkles' },
];

// ── RE content suggestion chips ──────────────────────────────────────────

export const RE_CONTENT_SUGGESTIONS = [
  { label: 'New listing post', guidance: 'Create an engaging new listing announcement post showcasing a property' },
  { label: 'Market update', guidance: 'Share a local real estate market update with current stats and trends' },
  { label: 'Buyer tips', guidance: 'Share actionable homebuying tips for first-time or move-up buyers' },
  { label: 'Seller tips', guidance: 'Share advice for home sellers on pricing, staging, or timing' },
  { label: 'Personal brand post', guidance: 'Create a post that builds your personal brand as a real estate agent' },
  { label: 'Local community post', guidance: 'Highlight a local business, event, or neighborhood feature' },
];

// ── Listing form fields ──────────────────────────────────────────────────

export interface REListingFormData {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  lotSize?: string;
  yearBuilt?: string;
  propertyType?: string;
  description?: string;
  features?: string;
  neighborhood?: string;
  showingInstructions?: string;
}
