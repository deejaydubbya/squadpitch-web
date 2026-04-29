import { ApiError } from '@/lib/apiFetch';

export interface GenerationErrorInfo {
  title: string;
  description: string;
  showRetry: boolean;
  showUpgrade: boolean;
  fallbackOptions: Array<{ label: string; action: 'library' | 'continue' | 'retry_later' }>;
}

const ERROR_MAP: Record<string, GenerationErrorInfo> = {
  SERVICE_UNAVAILABLE: {
    title: 'Generation temporarily unavailable',
    description: 'The image generation service is currently experiencing issues. This usually resolves within a few minutes.',
    showRetry: true,
    showUpgrade: false,
    fallbackOptions: [
      { label: 'Choose from library', action: 'library' },
      { label: 'Continue without media', action: 'continue' },
    ],
  },
  BUDGET_EXCEEDED: {
    title: 'Generation budget reached',
    description: 'Your account has reached the generation budget for this period. Try again later or upgrade your plan.',
    showRetry: false,
    showUpgrade: true,
    fallbackOptions: [
      { label: 'Choose from library', action: 'library' },
      { label: 'Continue without media', action: 'continue' },
    ],
  },
  IMAGE_LIMIT_EXCEEDED: {
    title: 'Image generation limit reached',
    description: 'You\'ve used all available image generations for your current plan.',
    showRetry: false,
    showUpgrade: true,
    fallbackOptions: [
      { label: 'Choose from library', action: 'library' },
      { label: 'Continue without media', action: 'continue' },
    ],
  },
  STORAGE_LIMIT: {
    title: 'Storage limit reached',
    description: 'Your media storage is full. Upgrade your plan or delete unused media to free up space.',
    showRetry: false,
    showUpgrade: true,
    fallbackOptions: [
      { label: 'Continue without media', action: 'continue' },
    ],
  },
  DUPLICATE_REQUEST: {
    title: 'Generation already in progress',
    description: 'A similar image is already being generated. Please wait for it to complete.',
    showRetry: false,
    showUpgrade: false,
    fallbackOptions: [
      { label: 'Wait and retry', action: 'retry_later' },
    ],
  },
  NO_MEDIA_PROFILE: {
    title: 'Media profile not configured',
    description: 'Set up a media profile for this workspace to enable AI image generation.',
    showRetry: false,
    showUpgrade: false,
    fallbackOptions: [
      { label: 'Choose from library', action: 'library' },
      { label: 'Continue without media', action: 'continue' },
    ],
  },
};

export function getGenerationErrorInfo(error: unknown): GenerationErrorInfo {
  if (error instanceof ApiError) {
    // Check by error code
    const mapped = ERROR_MAP[error.code];
    if (mapped) return mapped;

    // Check by HTTP status
    if (error.status === 402 || error.status === 429) {
      return ERROR_MAP.BUDGET_EXCEEDED;
    }
    if (error.status === 503) {
      return ERROR_MAP.SERVICE_UNAVAILABLE;
    }
  }

  // Default fallback
  return {
    title: 'Generation failed',
    description: error instanceof Error ? error.message : 'An unexpected error occurred.',
    showRetry: true,
    showUpgrade: false,
    fallbackOptions: [
      { label: 'Choose from library', action: 'library' },
      { label: 'Continue without media', action: 'continue' },
    ],
  };
}
