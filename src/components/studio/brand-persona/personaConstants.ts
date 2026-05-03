export type WizardStepId =
  | 'persona_type'
  | 'upload_training'
  | 'review_training'
  | 'persona_details'
  | 'style_profile'
  | 'training_progress'
  | 'preview_results'
  | 'persona_settings';

export interface WizardStepDef {
  id: WizardStepId;
  label: string;
  shortLabel: string;
}

export const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'persona_type', label: 'Choose Persona Type', shortLabel: 'Type' },
  { id: 'upload_training', label: 'Upload Training Images', shortLabel: 'Upload' },
  { id: 'review_training', label: 'Review Training Set', shortLabel: 'Review' },
  { id: 'persona_details', label: 'Persona Details', shortLabel: 'Details' },
  { id: 'style_profile', label: 'Style Profile', shortLabel: 'Style' },
  { id: 'training_progress', label: 'Training', shortLabel: 'Training' },
  { id: 'preview_results', label: 'Preview Results', shortLabel: 'Preview' },
  { id: 'persona_settings', label: 'Usage Settings', shortLabel: 'Settings' },
];

export const MIN_TRAINING_IMAGES = 12;
export const MAX_TRAINING_IMAGES = 20;

export const VISUAL_STYLES = [
  'Professional',
  'Casual',
  'Luxury',
  'Friendly',
  'Bold Social',
  'Modern Minimal',
] as const;

export const USAGE_AREAS = [
  { key: 'personalBrandPosts' as const, label: 'Personal brand posts' },
  { key: 'educationalGraphics' as const, label: 'Educational graphics' },
  { key: 'listingPromotions' as const, label: 'Listing promotions' },
  { key: 'smartVideoThumbnails' as const, label: 'Smart Video thumbnails' },
  { key: 'smartVideoIntroOutro' as const, label: 'Smart Video intro/outro' },
  { key: 'campaignCoverImages' as const, label: 'Campaign cover images' },
] as const;

export const TRAINING_PHASES = [
  { label: 'Uploading images...', progress: 15 },
  { label: 'Preparing dataset...', progress: 35 },
  { label: 'Training AI persona...', progress: 70 },
  { label: 'Creating preview images...', progress: 90 },
  { label: 'Complete!', progress: 100 },
] as const;

export const PREVIEW_LABELS = [
  'Professional portrait',
  'Social post graphic',
  'Listing promo',
  'Educational graphic',
  'Smart Video thumbnail',
] as const;

export const PERSONA_TYPE_OPTIONS = [
  {
    type: 'AGENT' as const,
    title: 'Me / Agent Persona',
    description: 'Train an AI version of your face and personal brand for marketing images.',
    icon: 'User',
    available: true,
  },
  {
    type: 'BRAND_STYLE' as const,
    title: 'Brand Visual Style',
    description: 'Train a consistent visual style for your brand content — no face needed.',
    icon: 'Palette',
    available: true,
  },
  {
    type: 'TEAM' as const,
    title: 'Team Persona',
    description: 'Create a group visual identity for your team or brokerage.',
    icon: 'Users',
    available: false,
  },
] as const;

export const PHOTO_GUIDELINES = [
  'Use photos from different angles (front, side, 3/4 view)',
  'Make sure your face is clearly visible and well-lit',
  'Include a mix of indoor and outdoor shots',
  'Avoid group photos — only you should be in the image',
  'Use high-quality photos (no blurry or low-res images)',
  'Wear different outfits to help the AI generalize',
] as const;

export const BRAND_STYLE_VISUAL_STYLES = [
  'Luxury',
  'Modern Minimal',
  'Warm and Approachable',
  'Bold Social',
  'Clean Professional',
] as const;

export const BRAND_STYLE_PHOTO_GUIDELINES = [
  'Upload examples of your brand graphics and social posts',
  'Include listing flyers, ads, or marketing materials',
  'Add color/style reference images and moodboards',
  'Include logo variations if available',
  'Mix different content types for better style training',
  'Use high-quality images (no blurry or low-res)',
] as const;

export const BRAND_STYLE_PREVIEW_LABELS = [
  'Social post graphic',
  'Educational graphic',
  'Market update',
  'Campaign cover',
  'Video thumbnail',
] as const;
