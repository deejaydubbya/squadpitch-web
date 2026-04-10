'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, ImageIcon, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMediaProfile,
  useUpsertMediaProfile,
  type UpsertMediaProfileInput,
  type MediaMode,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';

interface Props {
  clientId: string;
}

const MODES: Array<{
  value: MediaMode;
  label: string;
  description: string;
  icon: typeof ImageIcon;
}> = [
  {
    value: 'BRAND_ASSETS_ONLY',
    label: 'Brand assets only',
    description: 'Use uploaded brand photos and graphics.',
    icon: ImageIcon,
  },
  {
    value: 'BRAND_ASSETS_PLUS_AI',
    label: 'Brand assets + AI',
    description: 'Combine brand assets with AI-generated visuals.',
    icon: Sparkles,
  },
  {
    value: 'AI_CHARACTER',
    label: 'AI character',
    description: 'Use a trained LoRA character model.',
    icon: User,
  },
];

export function MediaProfileForm({ clientId }: Props) {
  const { data: media, isLoading } = useMediaProfile(clientId);
  const upsert = useUpsertMediaProfile(clientId);

  const [mode, setMode] = useState<MediaMode>('BRAND_ASSETS_ONLY');
  const [visualStyle, setVisualStyle] = useState('');
  const [characterPrompt, setCharacterPrompt] = useState('');
  const [basePromptTemplate, setBasePromptTemplate] = useState('');
  const [loraModelUrl, setLoraModelUrl] = useState('');
  const [loraTriggerWord, setLoraTriggerWord] = useState('');
  const [loraScale, setLoraScale] = useState<string>('1.0');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (media) {
      setMode(media.mode);
      setVisualStyle(media.visualStyle ?? '');
      setCharacterPrompt(media.characterPrompt ?? '');
      setBasePromptTemplate(media.basePromptTemplate ?? '');
      setLoraModelUrl(media.loraModelUrl ?? '');
      setLoraTriggerWord(media.loraTriggerWord ?? '');
      setLoraScale(String(media.loraScale ?? 1.0));
    }
  }, [media]);

  const handleSubmit = () => {
    const payload: UpsertMediaProfileInput = {
      mode,
      visualStyle: visualStyle.trim() || null,
      basePromptTemplate: basePromptTemplate.trim() || null,
      characterPrompt:
        mode === 'AI_CHARACTER' ? characterPrompt.trim() || null : null,
      loraModelUrl:
        mode === 'AI_CHARACTER' ? loraModelUrl.trim() || null : null,
      loraTriggerWord:
        mode === 'AI_CHARACTER' ? loraTriggerWord.trim() || null : null,
      loraScale:
        mode === 'AI_CHARACTER' ? parseFloat(loraScale) || 1.0 : null,
    };
    upsert.mutate(payload, {
      onSuccess: () => setSavedAt(Date.now()),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading media profile…</span>
      </div>
    );
  }

  const showSaved = savedAt && Date.now() - savedAt < 3000;

  return (
    <div className="card p-5 space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-white-100">Media strategy</h2>
        <p className="text-sm text-white-40 mt-0.5">
          Defines which visual pipeline is used when producing images for this
          client.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
          Mode
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={cn(
                  'text-left rounded-xl border p-3 transition-all',
                  active
                    ? 'border-accent-green-110 bg-accent-green-110/10'
                    : 'border-white-10 bg-white-5 hover:border-white-20'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 mb-2',
                    active ? 'text-accent-green-110' : 'text-white-40'
                  )}
                />
                <p
                  className={cn(
                    'text-sm font-medium',
                    active ? 'text-white-100' : 'text-white-80'
                  )}
                >
                  {m.label}
                </p>
                <p className="text-xs text-white-40 mt-0.5">{m.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
          Visual style
        </label>
        <textarea
          value={visualStyle}
          onChange={(e) => setVisualStyle(e.target.value)}
          placeholder="e.g. Clean, high contrast, outdoor lifestyle, warm colors…"
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
          Base prompt template
        </label>
        <textarea
          value={basePromptTemplate}
          onChange={(e) => setBasePromptTemplate(e.target.value)}
          placeholder="Optional base prompt prepended to all image generations."
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none font-mono"
        />
      </div>

      {mode === 'AI_CHARACTER' && (
        <div className="rounded-xl border border-accent-green-110/30 bg-accent-green-110/5 p-4 space-y-4">
          <p className="text-xs text-accent-green-110 uppercase tracking-wider font-semibold">
            AI character settings
          </p>

          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
              Character prompt
            </label>
            <textarea
              value={characterPrompt}
              onChange={(e) => setCharacterPrompt(e.target.value)}
              placeholder="Describe the character's appearance…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
              LoRA model URL
            </label>
            <input
              type="text"
              value={loraModelUrl}
              onChange={(e) => setLoraModelUrl(e.target.value)}
              placeholder="https://…/model.safetensors"
              className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
                Trigger word
              </label>
              <input
                type="text"
                value={loraTriggerWord}
                onChange={(e) => setLoraTriggerWord(e.target.value)}
                placeholder="e.g. acmechar"
                className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
                LoRA scale
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={loraScale}
                onChange={(e) => setLoraScale(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
              />
            </div>
          </div>
        </div>
      )}

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
          Save media profile
        </button>
      </div>
    </div>
  );
}
