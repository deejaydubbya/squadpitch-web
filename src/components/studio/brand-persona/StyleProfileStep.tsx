'use client';

import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import type { BrandStyleProfile } from '@/hooks/useSquadpitch';

interface Props {
  styleProfile: BrandStyleProfile | null | undefined;
  onSave: (profile: BrandStyleProfile) => void;
  onSkip: () => void;
  saving: boolean;
}

export function StyleProfileStep({ styleProfile, onSave, onSkip, saving }: Props) {
  const [colors, setColors] = useState<string[]>(styleProfile?.colors ?? []);
  const [fonts, setFonts] = useState<string[]>(styleProfile?.fonts ?? []);
  const [descriptors, setDescriptors] = useState<string[]>(styleProfile?.styleDescriptors ?? []);
  const [promptModifiers, setPromptModifiers] = useState(styleProfile?.promptModifiers ?? '');
  const [mood, setMood] = useState(styleProfile?.mood ?? '');

  const [colorInput, setColorInput] = useState('');
  const [fontInput, setFontInput] = useState('');
  const [descriptorInput, setDescriptorInput] = useState('');

  const addTag = useCallback(
    (list: string[], setList: (v: string[]) => void, value: string, max: number) => {
      const trimmed = value.trim();
      if (!trimmed || list.length >= max || list.includes(trimmed)) return;
      setList([...list, trimmed]);
    },
    []
  );

  const removeTag = useCallback(
    (list: string[], setList: (v: string[]) => void, index: number) => {
      setList(list.filter((_, i) => i !== index));
    },
    []
  );

  const hasContent =
    colors.length > 0 ||
    fonts.length > 0 ||
    descriptors.length > 0 ||
    promptModifiers.trim().length > 0 ||
    mood.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white-100">Style Profile</h2>
        <p className="text-sm text-white-40 mt-1">
          Define your brand&apos;s visual identity. This profile is used when generating
          graphics even without LoRA training.
        </p>
      </div>

      {/* Color Palette */}
      <div>
        <label className="block text-sm font-medium text-white-60 mb-1.5">
          Color Palette <span className="text-white-30 font-normal">(up to 8)</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {colors.map((c, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white-5 text-xs text-white-80"
            >
              <span
                className="w-3 h-3 rounded-full border border-white-15 flex-shrink-0"
                style={{ backgroundColor: c.startsWith('#') ? c : undefined }}
              />
              {c}
              <button
                onClick={() => removeTag(colors, setColors, i)}
                className="text-white-30 hover:text-white-60"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {colors.length < 8 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(colors, setColors, colorInput, 8);
                  setColorInput('');
                }
              }}
              placeholder="#1a2b3c or Navy Blue"
              className="flex-1 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
              maxLength={20}
            />
            <button
              onClick={() => {
                addTag(colors, setColors, colorInput, 8);
                setColorInput('');
              }}
              disabled={!colorInput.trim()}
              className="btn btn-ghost text-xs px-2 py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Fonts */}
      <div>
        <label className="block text-sm font-medium text-white-60 mb-1.5">
          Fonts <span className="text-white-30 font-normal">(up to 4)</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {fonts.map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white-5 text-xs text-white-80"
            >
              {f}
              <button
                onClick={() => removeTag(fonts, setFonts, i)}
                className="text-white-30 hover:text-white-60"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {fonts.length < 4 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={fontInput}
              onChange={(e) => setFontInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(fonts, setFonts, fontInput, 4);
                  setFontInput('');
                }
              }}
              placeholder="e.g., Playfair Display"
              className="flex-1 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
              maxLength={60}
            />
            <button
              onClick={() => {
                addTag(fonts, setFonts, fontInput, 4);
                setFontInput('');
              }}
              disabled={!fontInput.trim()}
              className="btn btn-ghost text-xs px-2 py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Style Descriptors */}
      <div>
        <label className="block text-sm font-medium text-white-60 mb-1.5">
          Style Descriptors <span className="text-white-30 font-normal">(up to 6)</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {descriptors.map((d, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white-5 text-xs text-white-80"
            >
              {d}
              <button
                onClick={() => removeTag(descriptors, setDescriptors, i)}
                className="text-white-30 hover:text-white-60"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {descriptors.length < 6 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={descriptorInput}
              onChange={(e) => setDescriptorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(descriptors, setDescriptors, descriptorInput, 6);
                  setDescriptorInput('');
                }
              }}
              placeholder="e.g., minimalist, warm tones, geometric"
              className="flex-1 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
              maxLength={100}
            />
            <button
              onClick={() => {
                addTag(descriptors, setDescriptors, descriptorInput, 6);
                setDescriptorInput('');
              }}
              disabled={!descriptorInput.trim()}
              className="btn btn-ghost text-xs px-2 py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-medium text-white-60 mb-1.5">
          Mood
        </label>
        <input
          type="text"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="e.g., Elegant and aspirational"
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          maxLength={100}
        />
      </div>

      {/* Prompt Modifiers */}
      <div>
        <label className="block text-sm font-medium text-white-60 mb-1.5">
          Prompt Modifiers <span className="text-white-30 font-normal">(advanced)</span>
        </label>
        <textarea
          value={promptModifiers}
          onChange={(e) => setPromptModifiers(e.target.value)}
          placeholder="Additional style instructions for image generation..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
          maxLength={500}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onSkip}
          className="btn btn-ghost px-4 py-2 text-sm"
        >
          Skip
        </button>
        <button
          onClick={() =>
            onSave({
              colors: colors.length > 0 ? colors : undefined,
              fonts: fonts.length > 0 ? fonts : undefined,
              styleDescriptors: descriptors.length > 0 ? descriptors : undefined,
              promptModifiers: promptModifiers.trim() || undefined,
              mood: mood.trim() || undefined,
            })
          }
          disabled={!hasContent || saving}
          className="btn btn-primary px-6 py-2 text-sm"
        >
          {saving ? 'Saving...' : 'Save Style Profile'}
        </button>
      </div>
    </div>
  );
}
