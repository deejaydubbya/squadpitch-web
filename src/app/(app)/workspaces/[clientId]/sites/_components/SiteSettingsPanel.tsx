'use client';

// SiteSettingsPanel — workspace-level Site settings. Theme accent
// color + favicon URL today; more options (custom domain mapping,
// global SEO defaults, OG image) come in later phases. Renders an
// inline color preview so the user can sanity-check the accent.

import { useEffect, useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { useSite, useUpdateSite } from '@/hooks/useSites';
import { ApiError } from '@/lib/apiFetch';

interface SiteSettingsPanelProps {
  clientId: string;
}

const DEFAULT_ACCENT = '#5b9979';

export function SiteSettingsPanel({ clientId }: SiteSettingsPanelProps) {
  const { data: site, isLoading } = useSite(clientId);
  const updateSite = useUpdateSite(clientId);

  const [accent, setAccent] = useState<string>(DEFAULT_ACCENT);
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!site) return;
    const theme = site.themeJson as { accent?: string } | null;
    setAccent(typeof theme?.accent === 'string' ? theme.accent : DEFAULT_ACCENT);
    setFaviconUrl(site.faviconUrl ?? '');
  }, [site?.id, site?.updatedAt]);
  /* eslint-disable-next-line react-hooks/exhaustive-deps */

  async function save() {
    setError(null);
    try {
      await updateSite.mutateAsync({
        themeJson: { accent },
        faviconUrl: faviconUrl.trim() ? faviconUrl.trim() : null,
      });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    }
  }

  if (isLoading) {
    return <div className="card p-6 text-sm text-white-50">Loading settings…</div>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white-90">Theme</h3>
          <p className="text-xs text-white-50 mt-0.5">
            Accent color is used for CTA buttons and headings across every
            published page in this workspace.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
            Accent color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border border-white-15"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
            />
            <input
              className="input font-mono text-sm flex-1"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              placeholder="#5b9979"
              maxLength={32}
            />
            <div
              className="w-12 h-10 rounded-lg border border-white-15"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
            Favicon URL
          </label>
          <input
            className="input font-mono text-xs"
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/…/favicon.ico"
          />
          <p className="text-xs text-white-40 mt-1.5">
            32×32 PNG or ICO. Leave blank to use the Squadpitch default.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-accent-red bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-primary text-sm inline-flex items-center gap-1.5"
          onClick={save}
          disabled={updateSite.isPending}
        >
          <Save className="w-4 h-4" />
          {updateSite.isPending ? 'Saving…' : 'Save settings'}
        </button>
        {savedAt && Date.now() - savedAt < 3000 && (
          <span className="text-xs text-accent-green-110">Saved</span>
        )}
      </div>
    </div>
  );
}
