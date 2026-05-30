'use client';

// Ads-09 — SquadAds export chooser panel.
//
// Replaces the two hard-coded JSON / Markdown buttons with a
// catalog of format cards grouped by category. Each card shows
// label, what it is, badge (direct-import / template / launch
// sheet), filename extension, and Preview + Download buttons.
//
// Honest framing throughout: no card claims "one-click import"
// for a platform that doesn't accept arbitrary uploads.

import {
  Download,
  Eye,
  FileJson,
  FileText,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  Megaphone,
  Linkedin,
} from 'lucide-react';
import {
  useExportFormats,
  type AdPackageDetail,
  type ExportFormatDescriptor,
} from '@/hooks/useAds';
import { cn } from '@/lib/utils';

interface ExportPanelProps {
  clientId: string;
  pkg: AdPackageDetail;
  exporting: boolean;
  exportingFormat: string | null;
  onPreview: (format: string) => void;
  onDownload: (format: string) => void;
}

// Category metadata. Order here = render order. Each category
// names which format slugs belong to it; anything not in any list
// falls into "Other".
const CATEGORIES: {
  key: string;
  label: string;
  helper: string;
  formats: string[];
}[] = [
  {
    key: 'core',
    label: 'Core exports',
    helper:
      'Universal bundle + brief — share with any paid-media specialist or your own future tooling.',
    formats: ['squadads_json', 'agency_markdown'],
  },
  {
    key: 'platform',
    label: 'Platform-template exports',
    helper:
      'Starter rows for Google Ads Editor and TikTok Ads Manager. Review inside each platform’s editor before posting — never a guaranteed one-click launch.',
    formats: ['google_ads_editor_csv', 'tiktok_bulk_template_csv'],
  },
  {
    key: 'launch',
    label: 'Launch sheets',
    helper:
      'Structured setup briefs for Meta (Facebook + Instagram), LinkedIn, and Pinterest. Open alongside the platform’s Ads Manager and work through the checklist.',
    formats: ['meta_launch_sheet', 'linkedin_launch_sheet', 'pinterest_launch_sheet'],
  },
];

export function ExportPanel({
  clientId,
  pkg,
  exporting,
  exportingFormat,
  onPreview,
  onDownload,
}: ExportPanelProps) {
  const { data: formats, isLoading, error } = useExportFormats(clientId);

  const exportable = pkg.status === 'READY' || pkg.status === 'EXPORTED';

  if (isLoading) {
    return (
      <section className="card p-4 text-sm text-white-50 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading export formats…
      </section>
    );
  }
  if (error || !formats) {
    return (
      <section className="card p-4 text-sm text-amber-200 bg-amber-400/5 border-amber-400/30 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Couldn’t load export formats. Refresh or try again later.</span>
      </section>
    );
  }

  const byFormat = new Map(formats.map((f) => [f.format, f]));
  const used = new Set<string>();
  const groups = CATEGORIES.map((cat) => {
    const items = cat.formats.map((f) => byFormat.get(f)).filter(Boolean) as ExportFormatDescriptor[];
    items.forEach((i) => used.add(i.format));
    return { ...cat, items };
  });
  const other = formats.filter((f) => !used.has(f.format));
  if (other.length > 0) {
    groups.push({
      key: 'other',
      label: 'Other exports',
      helper: 'Formats registered on the server that aren’t grouped above.',
      formats: other.map((o) => o.format),
      items: other,
    });
  }

  return (
    <section className="card p-4 space-y-4">
      <header className="space-y-1">
        <h2 className="text-xs font-semibold text-white-40 uppercase tracking-wider">
          Export this package
        </h2>
        <p className="text-[11px] text-white-50 leading-snug max-w-prose">
          Squadpitch does not launch ads. Exports include copy, audience,
          budget, destination URL, and creative asset references — your team
          copies them into Ads Manager, Google Ads, TikTok, or hands them
          to a paid-media specialist.
        </p>
      </header>

      {!exportable && (
        <div className="text-xs text-amber-200 bg-amber-400/5 border border-amber-400/30 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            This package is <strong>{pkg.status.toLowerCase()}</strong>. Mark
            it Ready before previewing or downloading exports. Generate
            creatives, set audience + budget + destination, then click{' '}
            <em>Mark ready</em> above.
          </span>
        </div>
      )}

      {groups.map((g) =>
        g.items.length === 0 ? null : (
          <div key={g.key} className="space-y-2">
            <div>
              <h3 className="text-xs font-semibold text-white-80">{g.label}</h3>
              <p className="text-[11px] text-white-50 leading-snug max-w-prose">
                {g.helper}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {g.items.map((f) => (
                <FormatCard
                  key={f.format}
                  descriptor={f}
                  exportable={exportable}
                  busy={exporting && exportingFormat === f.format}
                  onPreview={() => onPreview(f.format)}
                  onDownload={() => onDownload(f.format)}
                />
              ))}
            </div>
          </div>
        ),
      )}
    </section>
  );
}

function FormatCard({
  descriptor,
  exportable,
  busy,
  onPreview,
  onDownload,
}: {
  descriptor: ExportFormatDescriptor;
  exportable: boolean;
  busy: boolean;
  onPreview: () => void;
  onDownload: () => void;
}) {
  const Icon = iconFor(descriptor);
  const badges = badgesFor(descriptor);

  return (
    <div className="rounded-lg border border-white-10 bg-white-5 p-3 space-y-2 flex flex-col">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white-10 text-white-80 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-sm font-semibold text-white-100 truncate">
              {descriptor.label}
            </h4>
            <span className="text-[10px] uppercase tracking-wider font-mono text-white-50">
              .{descriptor.extension}
            </span>
          </div>
          <p className="text-[11px] text-white-50 leading-snug mt-0.5">
            {descriptor.notes}
          </p>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className={cn(
                    'text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                    b.tone,
                  )}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 pt-1 mt-auto">
        <button
          type="button"
          onClick={onPreview}
          disabled={!exportable || busy}
          className={cn(
            'text-xs font-medium px-2.5 py-1 rounded-md border border-white-15 text-white-80 hover:bg-white-10 inline-flex items-center gap-1.5',
            (!exportable || busy) && 'opacity-50 cursor-not-allowed',
          )}
          title="Generate the export and show it in a modal — does not mark this package as exported"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
          Preview
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!exportable || busy}
          className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-md bg-accent-green-110 text-sp-bg hover:bg-accent-green-100 inline-flex items-center gap-1.5',
            (!exportable || busy) && 'opacity-50 cursor-not-allowed',
          )}
          title="Save the export to disk AND mark this package as exported"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          Download
        </button>
      </div>
    </div>
  );
}

function iconFor(d: ExportFormatDescriptor) {
  if (d.format === 'squadads_json') return FileJson;
  if (d.format === 'agency_markdown') return FileText;
  if (d.platform === 'linkedin') return Linkedin;
  if (d.platform === 'meta' || d.platform === 'pinterest') return Megaphone;
  if (d.extension === 'csv') return FileSpreadsheet;
  if (d.extension === 'md') return FileText;
  return FileText;
}

interface Badge {
  label: string;
  tone: string;
}

function badgesFor(d: ExportFormatDescriptor): Badge[] {
  const badges: Badge[] = [];

  // What is this file for, in terms of "can I upload it directly"?
  if (d.isDirectImport) {
    badges.push({
      label: 'Direct import',
      tone: 'bg-accent-green-110/15 text-accent-green-110',
    });
  } else if (d.requiresPlatformTemplateReview) {
    badges.push({
      label: 'Paste into platform template',
      tone: 'bg-amber-400/15 text-amber-200',
    });
  } else if (d.importStyle) {
    // Has an importStyle but isn't a direct one-click — it's a
    // starter file that the user has to review inside the
    // platform's editor (e.g. Google Ads Editor).
    badges.push({
      label: 'Starter file — review in editor',
      tone: 'bg-blue-400/15 text-blue-300',
    });
  } else {
    badges.push({
      label: 'Setup brief / manual',
      tone: 'bg-white-10 text-white-70',
    });
  }

  // Platform pill — helps the user pick.
  if (d.platform && d.platform !== 'squadpitch' && d.platform !== 'any') {
    badges.push({
      label: d.platform,
      tone: 'bg-white-5 text-white-50',
    });
  }

  return badges;
}
