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

export default function SettingsPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const clientId = params.clientId;

  const { data: client, isLoading } = useClient(clientId);
  const update = useUpdateClient(clientId);
  const archive = useArchiveClient(clientId);

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setLogoUrl(client.logoUrl ?? '');
    }
  }, [client]);

  const handleSave = () => {
    update.mutate(
      { name: name.trim(), logoUrl: logoUrl.trim() || null },
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
          <h2 className="text-lg font-bold text-white-100">Settings</h2>
          <p className="text-sm text-white-40 mt-0.5">
            Rename your workspace or update its logo.
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

        {update.error && (
          <StatusBanner error={(update.error as Error).message} />
        )}
        {showSaved && <StatusBanner success message="Saved" />}

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
            Save
          </button>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white-100">Status</h3>
          <p className="text-xs text-white-40 mt-0.5">
            Pausing a client blocks all new generation requests.
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
        <div>
          <h3 className="text-sm font-semibold text-accent-red">Danger zone</h3>
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
