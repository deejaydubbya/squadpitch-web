'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, Plus, X } from 'lucide-react';
import {
  useVoiceProfile,
  useUpsertVoiceProfile,
  type UpsertVoiceProfileInput,
  type ContentBucket,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';

interface Props {
  clientId: string;
}

export function VoiceProfileForm({ clientId }: Props) {
  const { data: voice, isLoading } = useVoiceProfile(clientId);
  const upsert = useUpsertVoiceProfile(clientId);

  const [tone, setTone] = useState('');
  const [doList, setDoList] = useState<string[]>([]);
  const [dontList, setDontList] = useState<string[]>([]);
  const [banned, setBanned] = useState<string[]>([]);
  const [buckets, setBuckets] = useState<ContentBucket[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (voice) {
      setTone(voice.tone ?? '');
      setDoList(voice.voiceRulesJson?.do ?? []);
      setDontList(voice.voiceRulesJson?.dont ?? []);
      setBanned(voice.bannedPhrases ?? []);
      setBuckets(voice.contentBuckets ?? []);
    }
  }, [voice]);

  const handleSubmit = () => {
    const payload: UpsertVoiceProfileInput = {
      tone: tone.trim() || null,
      voiceRulesJson: {
        do: doList.map((s) => s.trim()).filter(Boolean),
        dont: dontList.map((s) => s.trim()).filter(Boolean),
      },
      bannedPhrases: banned.map((s) => s.trim()).filter(Boolean),
      contentBuckets: buckets
        .map((b) => ({
          key: b.key.trim(),
          label: b.label.trim(),
          template: b.template.trim(),
        }))
        .filter((b) => b.key && b.label),
    };
    upsert.mutate(payload, {
      onSuccess: () => setSavedAt(Date.now()),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading voice profile…</span>
      </div>
    );
  }

  const showSaved = savedAt && Date.now() - savedAt < 3000;

  return (
    <div className="card p-5 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-white-100">Voice & rules</h2>
        <p className="text-sm text-white-40 mt-0.5">
          Shapes how the AI writes. Version{' '}
          <span className="text-white-60 font-mono">
            v{voice?.version ?? 1}
          </span>
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
          Tone
        </label>
        <input
          type="text"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="e.g. Friendly, direct, encouraging, no jargon"
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StringList
          label="Do"
          items={doList}
          onChange={setDoList}
          placeholder="e.g. Speak in second person"
        />
        <StringList
          label="Don't"
          items={dontList}
          onChange={setDontList}
          placeholder="e.g. Avoid superlatives"
        />
      </div>

      <StringList
        label="Banned phrases"
        items={banned}
        onChange={setBanned}
        placeholder="e.g. unlock, game-changer"
        mono
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
            Content buckets
          </label>
          <button
            onClick={() =>
              setBuckets([...buckets, { key: '', label: '', template: '' }])
            }
            className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add bucket
          </button>
        </div>
        <p className="text-xs text-white-40 mb-3">
          Reusable content themes (e.g. launches, educational, testimonials).
          Select one when generating.
        </p>

        {buckets.length === 0 && (
          <p className="text-xs text-white-40 italic">No buckets yet.</p>
        )}

        <div className="space-y-3">
          {buckets.map((bucket, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-white-10 bg-white-5 p-3 space-y-2"
            >
              <div className="flex gap-2 items-start">
                <input
                  type="text"
                  value={bucket.key}
                  onChange={(e) =>
                    setBuckets(
                      buckets.map((b, i) =>
                        i === idx ? { ...b, key: e.target.value } : b
                      )
                    )
                  }
                  placeholder="key"
                  className="w-32 px-2 py-1.5 rounded bg-white-5 border border-white-10 text-white-100 text-xs font-mono focus:outline-none focus:border-accent-green-110"
                />
                <input
                  type="text"
                  value={bucket.label}
                  onChange={(e) =>
                    setBuckets(
                      buckets.map((b, i) =>
                        i === idx ? { ...b, label: e.target.value } : b
                      )
                    )
                  }
                  placeholder="Label"
                  className="flex-1 px-2 py-1.5 rounded bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
                />
                <button
                  onClick={() =>
                    setBuckets(buckets.filter((_, i) => i !== idx))
                  }
                  className="text-white-40 hover:text-accent-red p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={bucket.template}
                onChange={(e) =>
                  setBuckets(
                    buckets.map((b, i) =>
                      i === idx ? { ...b, template: e.target.value } : b
                    )
                  )
                }
                placeholder="Template prompt for this bucket…"
                rows={2}
                className="w-full px-2 py-1.5 rounded bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 resize-none"
              />
            </div>
          ))}
        </div>
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
          Save voice profile
        </button>
      </div>
    </div>
  );
}

function StringList({
  label,
  items,
  onChange,
  placeholder,
  mono = false,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  };

  return (
    <div>
      <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={`flex-1 px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 ${
            mono ? 'font-mono' : ''
          }`}
        />
        <button
          onClick={add}
          type="button"
          className="px-3 rounded-lg bg-white-10 hover:bg-white-20 text-white-60 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white-10 text-white-80 text-xs ${
                mono ? 'font-mono' : ''
              }`}
            >
              {item}
              <button
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="text-white-40 hover:text-accent-red"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
