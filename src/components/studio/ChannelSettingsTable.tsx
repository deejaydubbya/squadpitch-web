'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import {
  useChannelSettings,
  useUpsertChannelSettings,
  type Channel,
  type UpsertChannelSettingsItem,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';

interface Props {
  clientId: string;
}

const ALL_CHANNELS: Channel[] = [
  'INSTAGRAM',
  'TIKTOK',
  'X',
  'LINKEDIN',
  'FACEBOOK',
  'YOUTUBE',
];

interface Row {
  channel: Channel;
  isEnabled: boolean;
  maxChars: string;
  allowEmoji: boolean;
  trailingHashtags: string;
  notes: string;
}

const EMPTY_ROW = (channel: Channel): Row => ({
  channel,
  isEnabled: false,
  maxChars: '',
  allowEmoji: true,
  trailingHashtags: '',
  notes: '',
});

export function ChannelSettingsTable({ clientId }: Props) {
  const { data: channels, isLoading } = useChannelSettings(clientId);
  const upsert = useUpsertChannelSettings(clientId);

  const [rows, setRows] = useState<Row[]>(ALL_CHANNELS.map(EMPTY_ROW));
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (channels) {
      setRows(
        ALL_CHANNELS.map((ch) => {
          const existing = channels.find((c) => c.channel === ch);
          if (!existing) return EMPTY_ROW(ch);
          return {
            channel: ch,
            isEnabled: existing.isEnabled,
            maxChars:
              existing.maxChars != null ? String(existing.maxChars) : '',
            allowEmoji: existing.allowEmoji,
            trailingHashtags: (existing.trailingHashtags ?? []).join(' '),
            notes: existing.notes ?? '',
          };
        })
      );
    }
  }, [channels]);

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSubmit = () => {
    const items: UpsertChannelSettingsItem[] = rows.map((r) => ({
      channel: r.channel,
      isEnabled: r.isEnabled,
      maxChars: r.maxChars ? parseInt(r.maxChars, 10) : null,
      allowEmoji: r.allowEmoji,
      trailingHashtags: r.trailingHashtags
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
      notes: r.notes.trim() || null,
    }));
    upsert.mutate(items, {
      onSuccess: () => setSavedAt(Date.now()),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading channels…</span>
      </div>
    );
  }

  const showSaved = savedAt && Date.now() - savedAt < 3000;

  return (
    <div className="card p-5 space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-white-100">Channels</h2>
        <p className="text-sm text-white-40 mt-0.5">
          Enable the social channels this client publishes to. Rules here are
          fed into the generator.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={row.channel}
            className="rounded-lg border border-white-10 bg-white-5 p-3"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 min-w-28">
                <input
                  type="checkbox"
                  checked={row.isEnabled}
                  onChange={(e) =>
                    updateRow(idx, { isEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-accent-green-110"
                />
                <span className="text-sm font-medium text-white-100 font-mono">
                  {row.channel}
                </span>
              </label>

              <input
                type="number"
                min="0"
                value={row.maxChars}
                onChange={(e) => updateRow(idx, { maxChars: e.target.value })}
                placeholder="max chars"
                className="w-28 px-2 py-1.5 rounded bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
                disabled={!row.isEnabled}
              />

              <label className="flex items-center gap-1.5 text-xs text-white-60">
                <input
                  type="checkbox"
                  checked={row.allowEmoji}
                  onChange={(e) =>
                    updateRow(idx, { allowEmoji: e.target.checked })
                  }
                  className="w-3.5 h-3.5 accent-accent-green-110"
                  disabled={!row.isEnabled}
                />
                emoji
              </label>

              <input
                type="text"
                value={row.trailingHashtags}
                onChange={(e) =>
                  updateRow(idx, { trailingHashtags: e.target.value })
                }
                placeholder="#tag1 #tag2"
                className="flex-1 min-w-36 px-2 py-1.5 rounded bg-white-5 border border-white-10 text-white-100 text-xs font-mono focus:outline-none focus:border-accent-green-110"
                disabled={!row.isEnabled}
              />
            </div>
          </div>
        ))}
      </div>

      {upsert.error && (
        <StatusBanner error={(upsert.error as Error).message} />
      )}
      {showSaved && <StatusBanner success message="Saved" />}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={upsert.isPending}
          className="btn btn-primary text-xs flex items-center gap-1"
        >
          {upsert.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Save channels
        </button>
      </div>
    </div>
  );
}
