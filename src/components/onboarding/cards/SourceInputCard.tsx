'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getOnboardingConfig } from '@/lib/onboarding/configRegistry';
import { isUrl } from '@/lib/onboarding/helpers';
import type { StarterMethod } from '@/lib/onboarding/types';
import { ArrowRight, Loader2, Upload } from 'lucide-react';

interface Props {
  industryKey: string | null;
  starterMethod: StarterMethod | null;
  onSubmit: (input: string) => void;
  payload?: Record<string, unknown>;
}

export function SourceInputCard({ industryKey, starterMethod, onSubmit, payload }: Props) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payload-based input mode overrides starter-based detection
  const payloadInputMode = payload?.inputMode as string | undefined;

  const config = getOnboardingConfig(industryKey);
  const starter = config.starters.find((s) => s.method === starterMethod);
  const inputType: 'url' | 'textarea' | 'file' = payloadInputMode === 'url'
    ? 'url'
    : payloadInputMode === 'textarea'
      ? 'textarea'
      : payloadInputMode === 'file'
        ? 'file'
        : (starter?.inputType === 'textarea' ? 'textarea' : 'url');

  const placeholder = (payload?.placeholder as string)
    ?? starter?.placeholder
    ?? '';
  const accept = (payload?.accept as string) ?? undefined;

  const isValid = inputType === 'url'
    ? isUrl(value)
    : inputType === 'file'
      ? files.length > 0
      : value.trim().length > 10;

  const handleSubmit = () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    if (inputType === 'file') {
      // Submit file names as a summary string for now
      const names = files.map((f) => f.name).join(', ');
      onSubmit(names);
    } else {
      onSubmit(value.trim());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  // File upload input
  if (inputType === 'file') {
    return (
      <div className="flex flex-col gap-2">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 p-6 rounded-lg cursor-pointer',
            'bg-white-5 border border-dashed border-white-20 hover:border-accent-green-110/50',
            'transition-all',
          )}
        >
          <Upload className="w-6 h-6 text-white-40" />
          <p className="text-sm text-white-50">
            {files.length > 0
              ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
              : 'Click or drag files here'}
          </p>
          {files.length > 0 && (
            <p className="text-xs text-white-30 truncate max-w-full">
              {files.map((f) => f.name).join(', ')}
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className={cn(
            'self-end flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
            'transition-all',
            isValid && !submitting
              ? 'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer'
              : 'bg-white-10 text-white-30 cursor-not-allowed',
          )}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Upload <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    );
  }

  // Textarea input
  if (inputType === 'textarea') {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm',
            'bg-white-5 border border-white-10 text-white-90',
            'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
            'resize-none',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className={cn(
            'self-end flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
            'transition-all',
            isValid && !submitting
              ? 'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer'
              : 'bg-white-10 text-white-30 cursor-not-allowed',
          )}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Analyze <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    );
  }

  // URL input
  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'flex-1 px-3 py-2 rounded-lg text-sm',
          'bg-white-5 border border-white-10 text-white-90',
          'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
        )}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className={cn(
          'flex-none flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
          'transition-all',
          isValid && !submitting
            ? 'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer'
            : 'bg-white-10 text-white-30 cursor-not-allowed',
        )}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
