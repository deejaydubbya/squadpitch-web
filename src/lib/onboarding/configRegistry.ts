import type { OnboardingConfig } from './types';
import { fallbackConfig } from './configs/fallback';
import { realEstateConfig } from './configs/realEstate';

const configs: Record<string, OnboardingConfig> = {
  real_estate: realEstateConfig,
};

export function getOnboardingConfig(industryKey: string | null): OnboardingConfig {
  if (!industryKey) return fallbackConfig;
  return configs[industryKey] ?? { ...fallbackConfig, industryKey };
}
