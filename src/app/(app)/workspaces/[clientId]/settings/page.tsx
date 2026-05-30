'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save, Loader2, Archive, Play, Pause } from 'lucide-react';
import {
  useClient,
  useUpdateClient,
  useArchiveClient,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { listAdapterKeys, getAdapter } from '@/lib/assistant/adapterRegistry';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  normalizeLanguage,
} from '@/lib/languages';
import { useTranslations } from 'next-intl';
import { useUILanguage } from '@/components/i18n/UILocaleProvider';
import {
  SUPPORTED_UI_LANGUAGES,
  getUILanguageLabel,
  type SupportedUILanguage,
} from '@/lib/uiLanguage';

export default function SettingsPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const clientId = params.clientId;

  const { data: client, isLoading } = useClient(clientId);
  const update = useUpdateClient(clientId);
  const archive = useArchiveClient(clientId);

  // Phase 3 multilingual — dashboard UI language. Separate state
  // from `defaultLanguage` (content language) on purpose so a user
  // can speak Spanish to their dashboard while still generating
  // English posts for an English client, or vice versa.
  const t = useTranslations();
  const { language: uiLanguage, setLanguage: setUILanguage } = useUILanguage();

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [industryKey, setIndustryKey] = useState('real_estate');
  const [defaultLanguage, setDefaultLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const availableIndustries = listAdapterKeys().map((key) => ({
    key,
    label: getAdapter(key).label,
  }));

  useEffect(() => {
    if (client) {
      setName(client.name);
      setLogoUrl(client.logoUrl ?? '');
      setIndustryKey(client.industryKey ?? 'real_estate');
      setDefaultLanguage(normalizeLanguage(client.defaultLanguage));
    }
  }, [client]);

  const handleSave = () => {
    update.mutate(
      {
        name: name.trim(),
        logoUrl: logoUrl.trim() || null,
        industryKey,
        defaultLanguage,
      },
      { onSuccess: () => setSavedAt(Date.now()) }
    );
  };

  const togglePause = () => {
    if (!client) return;
    update.mutate({
      status: client.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED',
    });
  };

  const handleArchive = () => {
    archive.mutate(undefined, {
      onSuccess: () => router.push('/workspaces'),
    });
  };

  if (isLoading || !client) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading…</span>
      </div>
    );
  }

  const showSaved = savedAt && Date.now() - savedAt < 3000;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-5 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white-100">Workspace</h2>
          <p className="text-sm text-white-40 mt-0.5">
            Manage your workspace name, logo, and operational status.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Slug
          </label>
          <input
            type="text"
            value={client.slug}
            readOnly
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-40 text-sm font-mono cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Logo URL
          </label>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Industry
          </label>
          <select
            value={industryKey}
            onChange={(e) => setIndustryKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          >
            {availableIndustries.map((ind) => (
              <option key={ind.key} value={ind.key}>
                {ind.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-white-30 mt-1">
            Controls campaign types, terminology, and intelligence rules used by the assistant.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            {t('settings.contentLanguage.label')}
          </label>
          <select
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
                {lang.nativeLabel !== lang.label ? ` (${lang.nativeLabel})` : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-white-30 mt-1">
            {t('settings.contentLanguage.description')}
          </p>
        </div>

        {/* Phase 3 multilingual — App language. Stored separately
            from Content language so an agent can pick a different
            language for the dashboard chrome vs the content their
            workspace produces. Persisted in localStorage (per-
            browser) — moves to User.uiLanguage when that column
            lands. */}
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
            {t('settings.appLanguage.label')}
          </label>
          <select
            value={uiLanguage}
            onChange={(e) =>
              setUILanguage(e.target.value as SupportedUILanguage)
            }
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          >
            {SUPPORTED_UI_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {getUILanguageLabel(code)}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-white-30 mt-1">
            {t('settings.appLanguage.description')}
          </p>
        </div>

        {update.error && (
          <StatusBanner error={(update.error as Error).message} />
        )}
        {showSaved && <StatusBanner success message={t('common.saved')} />}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={update.isPending || !name.trim()}
            className="btn btn-primary text-xs flex items-center gap-1"
          >
            {update.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            {update.isPending ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white-100">Status</h3>
          <p className="text-xs text-white-40 mt-0.5">
            Pausing a workspace stops all content generation and scheduled publishing. Existing drafts are preserved.
          </p>
        </div>
        <button
          onClick={togglePause}
          className="text-xs px-3 py-1.5 rounded-md bg-white-10 text-white-100 hover:bg-white-20 flex items-center gap-1.5"
        >
          {client.status === 'PAUSED' ? (
            <>
              <Play className="w-3.5 h-3.5" /> Resume client
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause client
            </>
          )}
        </button>
      </div>

      <div className="card p-5 space-y-4 border-accent-red/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-accent-red">Danger zone</h3>
        </div>
        <div>
          <p className="text-xs text-white-40 mt-0.5">
            Archiving hides the client from the list. Existing drafts are
            preserved.
          </p>
        </div>

        {archive.error && (
          <StatusBanner error={(archive.error as Error).message} />
        )}

        {!confirmArchive ? (
          <button
            onClick={() => setConfirmArchive(true)}
            className="text-xs px-3 py-1.5 rounded-md bg-accent-red/20 text-accent-red hover:bg-accent-red/30 flex items-center gap-1.5"
          >
            <Archive className="w-3.5 h-3.5" /> Archive client
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleArchive}
              disabled={archive.isPending}
              className="text-xs px-3 py-1.5 rounded-md bg-accent-red text-white-100 hover:bg-accent-red/80 flex items-center gap-1.5 disabled:opacity-50"
            >
              {archive.isPending && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              Confirm archive
            </button>
            <button
              onClick={() => setConfirmArchive(false)}
              className="text-xs px-3 py-1.5 rounded-md bg-white-10 text-white-60 hover:bg-white-20"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
