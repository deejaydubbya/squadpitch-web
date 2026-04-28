import type { OnboardingConfig } from '../types';

export const fallbackConfig: OnboardingConfig = {
  industryKey: '_fallback',
  useFallbackFlow: true,
  starters: [
    // These are the sub-starters used after fallback intent selection
    {
      method: 'website',
      label: 'Website URL',
      description: "We'll analyze your site to extract your brand, voice, and content ideas.",
      icon: 'Globe',
      inputType: 'url',
      placeholder: 'https://yourwebsite.com',
    },
    {
      method: 'description',
      label: 'Describe it manually',
      description: 'Tell us about your business and what makes it unique.',
      icon: 'MessageSquare',
      inputType: 'textarea',
      placeholder: 'Describe your business, what you offer, and who your customers are...',
    },
    {
      method: 'documents',
      label: 'Upload documents',
      description: 'Upload PDFs, docs, or marketing materials.',
      icon: 'FileText',
      inputType: 'none',
      placeholder: undefined,
    },
    {
      method: 'scratch',
      label: 'Skip and start simple',
      description: 'Jump in and start creating right away.',
      icon: 'Sparkles',
      inputType: 'none',
    },
  ],
  enrichmentCards: [
    {
      key: 'additional_urls',
      label: 'Add more URLs',
      description: 'Improve content accuracy with more sources.',
      icon: 'Globe',
      cardType: 'source_input',
      payload: { inputMode: 'url', placeholder: 'https://...' },
    },
    {
      key: 'documents',
      label: 'Upload documents',
      description: 'Add business info from PDFs, docs, or CSVs.',
      icon: 'FileText',
      cardType: 'source_input',
      payload: { inputMode: 'file' },
    },
    {
      key: 'add_description',
      label: 'Add more details',
      description: 'Improve content accuracy with your own words.',
      icon: 'MessageSquare',
      cardType: 'source_input',
      payload: { inputMode: 'textarea', placeholder: 'Tell us more about your business...' },
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
  welcomeMessage: "Let's get you set up fast. What do you want to create content for?",
  analysisMessage: "Analyzing your business — this usually takes about 30 seconds.",
  valueMessage: "Great news! I've built your brand profile and generated some sample posts. Take a look!",
};

// ── Fallback intent definitions ──────────────────────────────────────────

export interface FallbackIntentDef {
  intent: 'my_business' | 'product_service' | 'just_create';
  label: string;
  description: string;
  icon: string;
}

export const FALLBACK_INTENTS: FallbackIntentDef[] = [
  {
    intent: 'my_business',
    label: 'My business',
    description: 'Set up your brand and generate content for your business.',
    icon: 'Building2',
  },
  {
    intent: 'product_service',
    label: 'A product or service',
    description: 'Create content to promote a specific product or service.',
    icon: 'ShoppingBag',
  },
  {
    intent: 'just_create',
    label: 'Just create content',
    description: 'Skip setup and start making posts right away.',
    icon: 'Sparkles',
  },
];

export const FALLBACK_SOURCE_PROMPT: Record<string, string> = {
  my_business: "What's the easiest way to tell me about your business?",
  product_service: "How would you like to share your product or service info?",
};

// ── Content suggestion chips for "Just create content" ───────────────────

export const CONTENT_SUGGESTIONS = [
  { label: 'Educational tip', guidance: 'Share a useful, actionable tip for your audience' },
  { label: 'Behind the scenes', guidance: 'Show a behind-the-scenes look at your work' },
  { label: 'Success story', guidance: 'Share a client success story or testimonial' },
  { label: 'Industry insight', guidance: 'Share a trend or observation from your field' },
  { label: 'How-to guide', guidance: 'Walk through a step-by-step process' },
  { label: 'Q&A', guidance: 'Answer a question you get asked frequently' },
];
