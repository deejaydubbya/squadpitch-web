import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SUPPORTED_UI_LANGUAGES,
  DEFAULT_UI_LANGUAGE,
  isSupportedUILanguage,
  readStoredUILanguage,
  writeStoredUILanguage,
  getUILanguageLabel,
} from './uiLanguage';

describe('SUPPORTED_UI_LANGUAGES', () => {
  it('ships English and Spanish only in Phase 3', () => {
    expect(SUPPORTED_UI_LANGUAGES).toEqual(['en', 'es']);
  });

  it('defaults to English', () => {
    expect(DEFAULT_UI_LANGUAGE).toBe('en');
  });
});

describe('isSupportedUILanguage', () => {
  it('accepts each supported code', () => {
    for (const code of SUPPORTED_UI_LANGUAGES) {
      expect(isSupportedUILanguage(code)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    expect(isSupportedUILanguage('fr')).toBe(false);
    expect(isSupportedUILanguage('EN')).toBe(false); // case-sensitive
    expect(isSupportedUILanguage('')).toBe(false);
    expect(isSupportedUILanguage(undefined)).toBe(false);
    expect(isSupportedUILanguage(null)).toBe(false);
    expect(isSupportedUILanguage(42)).toBe(false);
  });
});

describe('getUILanguageLabel', () => {
  it('returns English and Spanish native labels', () => {
    expect(getUILanguageLabel('en')).toBe('English');
    expect(getUILanguageLabel('es')).toBe('Español');
  });
});

describe('readStoredUILanguage / writeStoredUILanguage', () => {
  // Vitest runs without jsdom by default for this project, so we
  // stub a minimal localStorage on globalThis to exercise the
  // browser-side branch without pulling in the whole DOM.
  type StubStorage = Pick<Storage, 'getItem' | 'setItem'>;
  let store: Record<string, string>;
  let originalWindow: unknown;

  beforeEach(() => {
    store = {};
    const stubStorage: StubStorage = {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value;
      },
    };
    originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {
      localStorage: stubStorage,
    };
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
    vi.restoreAllMocks();
  });

  it('returns default when no preference is stored', () => {
    expect(readStoredUILanguage()).toBe(DEFAULT_UI_LANGUAGE);
  });

  it('round-trips a supported language', () => {
    writeStoredUILanguage('es');
    expect(readStoredUILanguage()).toBe('es');
  });

  it('falls back to default when stored value is malformed', () => {
    store['squadpitch.uiLanguage'] = 'klingon';
    expect(readStoredUILanguage()).toBe(DEFAULT_UI_LANGUAGE);
  });

  it('treats localStorage failures as no-ops without throwing', () => {
    (globalThis as { window: { localStorage: StubStorage } }).window = {
      localStorage: {
        getItem: () => {
          throw new Error('quota exceeded');
        },
        setItem: () => {
          throw new Error('quota exceeded');
        },
      },
    };
    expect(readStoredUILanguage()).toBe(DEFAULT_UI_LANGUAGE);
    expect(() => writeStoredUILanguage('es')).not.toThrow();
  });
});
