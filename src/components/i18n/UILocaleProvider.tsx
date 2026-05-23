'use client';

// Phase 3 multilingual support — dashboard UI locale provider.
//
// Wraps the (app) layout so every dashboard route has access to
// next-intl's translation hooks (`useTranslations`, etc.). The
// provider is intentionally NOT wired into middleware-based locale
// routing — workspace URLs like `/workspaces/[clientId]/...` must
// keep their existing shape, and the spec explicitly defers that
// pattern.
//
// Locale resolution:
//   1. Read from localStorage on mount (per-browser preference).
//   2. Fall back to "en" — the only locale we ship today.
//   3. Updates are propagated by calling `setUILanguage` from the
//      App language picker; the provider re-renders with the new
//      messages without a full page reload.
//
// IMPORTANT: This does NOT touch `Client.defaultLanguage` (the
// content-generation gate). See `lib/uiLanguage.ts` for the
// product-side rationale.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import {
  DEFAULT_UI_LANGUAGE,
  readStoredUILanguage,
  writeStoredUILanguage,
  type SupportedUILanguage,
} from '@/lib/uiLanguage';
import enMessages from '../../../messages/en.json';
import esMessages from '../../../messages/es.json';

type Messages = typeof enMessages;

const MESSAGE_BUNDLES: Record<SupportedUILanguage, Messages> = {
  en: enMessages,
  es: esMessages as Messages,
};

interface UILanguageCtx {
  language: SupportedUILanguage;
  setLanguage: (lang: SupportedUILanguage) => void;
}

const UILanguageContext = createContext<UILanguageCtx | null>(null);

/** Public hook for the App language picker + any consumer that needs to read/set. */
export function useUILanguage(): UILanguageCtx {
  const ctx = useContext(UILanguageContext);
  if (!ctx) {
    throw new Error('useUILanguage must be used within UILocaleProvider');
  }
  return ctx;
}

export function UILocaleProvider({ children }: { children: ReactNode }) {
  // Start with the default so SSR and the first client render agree
  // (no hydration mismatch). The effect below upgrades to the
  // stored preference after mount.
  const [language, setLanguageState] = useState<SupportedUILanguage>(
    DEFAULT_UI_LANGUAGE,
  );

  useEffect(() => {
    const stored = readStoredUILanguage();
    if (stored !== DEFAULT_UI_LANGUAGE) {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = useCallback((lang: SupportedUILanguage) => {
    setLanguageState(lang);
    writeStoredUILanguage(lang);
  }, []);

  const ctxValue = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  const messages = MESSAGE_BUNDLES[language] ?? MESSAGE_BUNDLES.en;

  return (
    <UILanguageContext.Provider value={ctxValue}>
      <NextIntlClientProvider
        locale={language}
        messages={messages}
        // Fall back to "en" timezone/format defaults — most of the
        // app already uses Client.timezone for content scheduling,
        // and the starter slice doesn't use date/number formatting
        // helpers yet.
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </UILanguageContext.Provider>
  );
}
