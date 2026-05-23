// Phase 3 multilingual support — dashboard UI language.
//
// IMPORTANT: this is NOT the same as `Client.defaultLanguage`.
//
//   - Client.defaultLanguage  controls the language Squadpitch *generates*
//                             content in (posts, captions, landing pages,
//                             inbox replies). Phase 0/1 storage.
//   - UI language (this file) controls the language the dashboard renders
//                             its chrome in (sidebar nav, settings
//                             headings, common buttons in the starter
//                             slice). Phase 3 storage.
//
// They are deliberately independent — a US Spanish-speaking agent may
// prefer the dashboard in English while still generating Spanish posts
// for their clients, or vice versa.
//
// Phase 3 stores the UI preference in localStorage (per-browser). When
// the User model grows a `uiLanguage` column we can swap the storage
// layer here without touching the provider or any consumer.

export const SUPPORTED_UI_LANGUAGES = ['en', 'es'] as const;

export type SupportedUILanguage = (typeof SUPPORTED_UI_LANGUAGES)[number];

export const DEFAULT_UI_LANGUAGE: SupportedUILanguage = 'en';

const STORAGE_KEY = 'squadpitch.uiLanguage';

export function isSupportedUILanguage(
  value: unknown,
): value is SupportedUILanguage {
  return (
    typeof value === 'string'
    && (SUPPORTED_UI_LANGUAGES as readonly string[]).includes(value)
  );
}

/**
 * Reads the persisted UI-language preference. Safe to call during SSR
 * — returns the default when `window` is undefined. Bad values fall
 * through to the default so a corrupted localStorage entry can't
 * crash the dashboard.
 */
export function readStoredUILanguage(): SupportedUILanguage {
  if (typeof window === 'undefined') return DEFAULT_UI_LANGUAGE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isSupportedUILanguage(raw) ? raw : DEFAULT_UI_LANGUAGE;
  } catch {
    return DEFAULT_UI_LANGUAGE;
  }
}

/**
 * Persists the UI-language preference. No-op on the server. Throws
 * never — a write failure (private mode, storage quota) silently
 * drops the change.
 */
export function writeStoredUILanguage(lang: SupportedUILanguage): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Best-effort persistence; the in-memory provider state already
    // reflects the change so the user sees the switch immediately.
  }
}

/** Pretty label for the picker — kept here so non-React callers can use it. */
export function getUILanguageLabel(code: SupportedUILanguage): string {
  switch (code) {
    case 'es':
      return 'Español';
    case 'en':
    default:
      return 'English';
  }
}
