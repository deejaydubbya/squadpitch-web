'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useCrmAnalyze, type AgentProfileDraft } from '@/hooks/useSquadpitch';
import { Upload, Loader2, Check, FileText } from 'lucide-react';

interface Props {
  clientId: string | null;
  onDone: (source: AgentProfileDraft) => void;
}

export function SourceCrmCard({ clientId, onDone }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const analyze = useCrmAnalyze();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const text = await file.text();

    try {
      const result = await analyze.mutateAsync(text);
      onDone(result);
    } catch {
      // Error handled by mutation state
    }
  };

  if (analyze.isSuccess) {
    return (
      <div className="flex items-center gap-2 p-3 bg-accent-green-110/10 rounded-lg">
        <Check className="w-4 h-4 text-accent-green-110" />
        <p className="text-sm text-accent-green-110">CRM data imported from {fileName}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="hidden"
      />

      {analyze.isPending ? (
        <div className="flex items-center gap-2 p-3 bg-white-5 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-accent-green-110" />
          <p className="text-sm text-white-60">Analyzing {fileName}...</p>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex items-center gap-3 p-4 rounded-lg text-left',
            'bg-white-5 hover:bg-white-10 border border-dashed border-white-20 hover:border-accent-green-110/30',
            'transition-all cursor-pointer',
          )}
        >
          <Upload className="w-5 h-5 text-accent-green-110 flex-none" />
          <div>
            <p className="text-sm text-white-80">Upload CSV export</p>
            <p className="text-xs text-white-40 mt-0.5">Export contacts or listings from your CRM</p>
          </div>
        </button>
      )}

      {analyze.isError && (
        <p className="text-xs text-red-400">{analyze.error?.message || 'CRM analysis failed.'}</p>
      )}
    </div>
  );
}
