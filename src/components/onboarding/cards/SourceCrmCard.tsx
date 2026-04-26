'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useCrmAnalyze, type AgentProfileDraft } from '@/hooks/useSquadpitch';
import { Upload, Loader2, Check } from 'lucide-react';

export interface CrmExtractedItems {
  importedCount: number;
  csvItems: Array<{ type: string; title: string; summary?: string; dataJson?: Record<string, unknown> }>;
}

interface Props {
  clientId: string | null;
  onDone: (source: AgentProfileDraft, extra: CrmExtractedItems) => void;
}

/** Auto-detect which CSV column is the "title" (address, name, etc.) */
function autoMapTitle(headers: string[]): string | undefined {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const titleCandidates = ['address', 'property address', 'street address', 'listing address', 'full address', 'name', 'title', 'property', 'listing'];
  for (const candidate of titleCandidates) {
    const idx = lower.indexOf(candidate);
    if (idx >= 0) return headers[idx];
  }
  return headers[0]; // fallback to first column
}

/** Auto-detect which CSV column is the "summary" (description, notes, etc.) */
function autoMapSummary(headers: string[]): string | undefined {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const summaryCandidates = ['description', 'remarks', 'notes', 'summary', 'comments', 'listing description', 'public remarks'];
  for (const candidate of summaryCandidates) {
    const idx = lower.indexOf(candidate);
    if (idx >= 0) return headers[idx];
  }
  return undefined;
}

export function SourceCrmCard({ clientId, onDone }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'importing' | 'done' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const analyze = useCrmAnalyze();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;

    let extractedItems: Array<{ type: string; title: string; summary?: string; dataJson?: Record<string, unknown> }> = [];

    setFileName(file.name);
    setStatus('analyzing');
    setStatusMsg('Analyzing CRM data...');
    setErrorMsg('');

    const text = await file.text();

    // Step 1: Agent profile extraction (existing)
    let profileResult: AgentProfileDraft | null = null;
    try {
      profileResult = await analyze.mutateAsync(text);
    } catch {
      // Non-critical — we can still import data items
    }

    // Step 2: Import CSV rows as data items
    setStatus('importing');
    setStatusMsg('Importing listings...');

    try {
      // Preview to get headers
      const previewRes = await fetch(`/api/proxy/workspaces/${clientId}/data-import/csv/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: text }),
      });

      if (!previewRes.ok) throw new Error('Failed to parse CSV');

      const { headers, rowCount } = await previewRes.json() as { headers: string[]; rowCount: number };

      if (rowCount === 0 || headers.length === 0) {
        throw new Error('CSV has no data rows');
      }

      // Auto-map columns
      const titleCol = autoMapTitle(headers);
      const summaryCol = autoMapSummary(headers);
      const dataJsonFields = headers.filter((h) => h !== titleCol && h !== summaryCol);

      // Extract items
      const extractRes = await fetch(`/api/proxy/workspaces/${clientId}/data-import/csv/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: text,
          columnMapping: {
            title: titleCol,
            summary: summaryCol,
            dataJsonFields,
          },
          defaultType: 'PROPERTY',
        }),
      });

      if (!extractRes.ok) throw new Error('Failed to extract data');

      const { items } = await extractRes.json() as { items: Array<{ type: string; title: string; summary?: string; dataJson?: Record<string, unknown>; tags?: string[]; priority?: number }> };

      extractedItems = items;
      setImportedCount(items.length);
    } catch {
      // Data import failed but profile extraction may have succeeded — continue
    }

    setStatus('done');
    const source = profileResult ?? ({ sourceType: 'crm_import' } as AgentProfileDraft);
    onDone(source, { importedCount: extractedItems.length, csvItems: extractedItems });
  };

  if (status === 'done') {
    return (
      <div className="flex flex-col gap-1.5 p-3 bg-accent-green-110/10 rounded-lg">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-accent-green-110" />
          <p className="text-sm text-accent-green-110">CRM data imported from {fileName}</p>
        </div>
        {importedCount > 0 && (
          <p className="text-xs text-accent-green-110/70 ml-6">
            {importedCount} listing{importedCount !== 1 ? 's' : ''} ready to import
          </p>
        )}
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

      {status === 'analyzing' || status === 'importing' ? (
        <div className="flex items-center gap-2 p-3 bg-white-5 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-accent-green-110" />
          <p className="text-sm text-white-60">{statusMsg}</p>
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

      {(status === 'error' || analyze.isError) && (
        <p className="text-xs text-red-400">{errorMsg || analyze.error?.message || 'CRM analysis failed.'}</p>
      )}
    </div>
  );
}
