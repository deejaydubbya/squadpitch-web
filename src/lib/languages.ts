// FE mirror of the API's supported-content-language allow-list
// (`squadpitch-api/lib/languages.js`). Kept in lockstep — if you
// add a language here, also add it on the API + run the i18n
// phrasebook QA for it in the industry prompts.
//
// Phase 0 of the multilingual rollout ships only the language
// PICKER + storage. Generation behavior is unchanged until Phase 1.

export interface LanguageOption {
  code: string;
  /** Display label in English (used in the dashboard chrome). */
  label: string;
  /** Display label in the language itself (used in language pickers). */
  nativeLabel: string;
}

export const DEFAULT_LANGUAGE = 'en';

export const SUPPORTED_LANGUAGES: ReadonlyArray<LanguageOption> = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
] as const;

export function isSupportedLanguage(code: unknown): code is string {
  return (
    typeof code === 'string'
    && SUPPORTED_LANGUAGES.some((l) => l.code === code.trim().toLowerCase())
  );
}

/** Always returns a supported code; falls back to "en" on bad input. */
export function normalizeLanguage(code: unknown): string {
  if (typeof code !== 'string') return DEFAULT_LANGUAGE;
  const lower = code.trim().toLowerCase();
  return isSupportedLanguage(lower) ? lower : DEFAULT_LANGUAGE;
}

export function getLanguageLabel(code: unknown): string {
  if (typeof code !== 'string') return DEFAULT_LANGUAGE;
  const lower = code.toLowerCase();
  const entry = SUPPORTED_LANGUAGES.find((l) => l.code === lower);
  return entry ? entry.label : code;
}
