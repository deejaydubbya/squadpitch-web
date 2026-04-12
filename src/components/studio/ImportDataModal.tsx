'use client';

import { useState, useRef } from 'react';
import {
  X,
  Loader2,
  Globe,
  FileText,
  FileSpreadsheet,
  Link2,
  Trash2,
  ChevronDown,
  Upload,
  AlertCircle,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useImportFromUrl,
  useImportFromText,
  useCSVPreview,
  useCSVExtract,
  useImportFromSheets,
  useImportFromNotion,
  useConfirmImport,
  type ExtractedItem,
  type DataItemType,
  type DataSourceType,
  type CSVColumnMapping,
} from '@/hooks/useSquadpitch';
import {
  useGenericIntegrations,
  useSheetsSpreadsheets,
} from '@/hooks/useIntegrations';

const TABS = [
  { key: 'url', label: 'URL', icon: Globe },
  { key: 'text', label: 'Text', icon: FileText },
  { key: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { key: 'sheets', label: 'Google Sheets', icon: FileSpreadsheet },
  { key: 'notion', label: 'Notion', icon: Link2 },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const TYPE_OPTIONS: { value: DataItemType; label: string }[] = [
  { value: 'TESTIMONIAL', label: 'Testimonial' },
  { value: 'CASE_STUDY', label: 'Case Study' },
  { value: 'PRODUCT_LAUNCH', label: 'Product Launch' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'STATISTIC', label: 'Statistic' },
  { value: 'MILESTONE', label: 'Milestone' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'TEAM_SPOTLIGHT', label: 'Team Spotlight' },
  { value: 'INDUSTRY_NEWS', label: 'Industry News' },
  { value: 'EVENT', label: 'Event' },
  { value: 'CUSTOM', label: 'Custom' },
];

const TYPE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, t.label])
);

interface Props {
  clientId: string;
  onClose: () => void;
}

export function ImportDataModal({ clientId, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('url');
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [sourceType, setSourceType] = useState<DataSourceType>('URL');
  const [sourceUrl, setSourceUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // URL state
  const [url, setUrl] = useState('');
  const [urlHint, setUrlHint] = useState('');

  // Text state
  const [text, setText] = useState('');
  const [textHint, setTextHint] = useState('');

  // CSV state
  const [csvContent, setCsvContent] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRowCount, setCsvRowCount] = useState(0);
  const [csvMapping, setCsvMapping] = useState<CSVColumnMapping>({});
  const [csvStep, setCsvStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheets state
  const [sheetsIntegrationId, setSheetsIntegrationId] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [sheetsHint, setSheetsHint] = useState('');

  // Notion state
  const [notionIntegrationId, setNotionIntegrationId] = useState('');
  const [notionHint, setNotionHint] = useState('');

  // Mutations
  const importUrl = useImportFromUrl(clientId);
  const importText = useImportFromText(clientId);
  const csvPreview = useCSVPreview(clientId);
  const csvExtract = useCSVExtract(clientId);
  const importSheets = useImportFromSheets(clientId);
  const importNotion = useImportFromNotion(clientId);
  const confirmImport = useConfirmImport(clientId);

  // Integration queries
  const { data: sheetsIntegrations } = useGenericIntegrations('google_sheets');
  const { data: notionIntegrations } = useGenericIntegrations('notion');
  const { data: spreadsheets } = useSheetsSpreadsheets(sheetsIntegrationId);

  const isExtracting =
    importUrl.isPending ||
    importText.isPending ||
    csvPreview.isPending ||
    csvExtract.isPending ||
    importSheets.isPending ||
    importNotion.isPending;

  const handleTabChange = (key: TabKey) => {
    setTab(key);
    setExtractedItems([]);
    setError(null);
  };

  const handleExtractUrl = () => {
    setError(null);
    importUrl.mutate(
      { url, hint: urlHint || undefined },
      {
        onSuccess: (data) => {
          setExtractedItems(data.items);
          setSourceType('URL');
          setSourceUrl(data.sourceUrl);
        },
        onError: (err) => setError(err.message || 'Failed to extract from URL'),
      }
    );
  };

  const handleExtractText = () => {
    setError(null);
    importText.mutate(
      { text, hint: textHint || undefined },
      {
        onSuccess: (data) => {
          setExtractedItems(data.items);
          setSourceType('TEXT');
          setSourceUrl(undefined);
        },
        onError: (err) => setError(err.message || 'Failed to extract from text'),
      }
    );
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setCsvContent(content);
      setError(null);
      csvPreview.mutate(
        { csvContent: content },
        {
          onSuccess: (data) => {
            setCsvHeaders(data.headers);
            setCsvRowCount(data.rowCount);
            setCsvStep('map');
          },
          onError: (err) => setError(err.message || 'Failed to parse CSV'),
        }
      );
    };
    reader.readAsText(file);
  };

  const handleCSVExtract = () => {
    setError(null);
    csvExtract.mutate(
      { csvContent, columnMapping: csvMapping, defaultType: 'CUSTOM' },
      {
        onSuccess: (data) => {
          setExtractedItems(data.items);
          setSourceType('CSV');
          setSourceUrl(undefined);
          setCsvStep('preview');
        },
        onError: (err) => setError(err.message || 'Failed to extract from CSV'),
      }
    );
  };

  const handleExtractSheets = () => {
    setError(null);
    importSheets.mutate(
      {
        integrationId: sheetsIntegrationId,
        spreadsheetId,
        sheetName: sheetName || undefined,
        hint: sheetsHint || undefined,
      },
      {
        onSuccess: (data) => {
          setExtractedItems(data.items);
          setSourceType('GOOGLE_SHEETS');
          setSourceUrl(undefined);
        },
        onError: (err) => setError(err.message || 'Failed to extract from Google Sheets'),
      }
    );
  };

  const handleExtractNotion = () => {
    setError(null);
    importNotion.mutate(
      { integrationId: notionIntegrationId, hint: notionHint || undefined },
      {
        onSuccess: (data) => {
          setExtractedItems(data.items);
          setSourceType('NOTION');
          setSourceUrl(undefined);
        },
        onError: (err) => setError(err.message || 'Failed to extract from Notion'),
      }
    );
  };

  const removeItem = (index: number) => {
    setExtractedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemType = (index: number, type: DataItemType) => {
    setExtractedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, type } : item))
    );
  };

  const handleConfirmImport = () => {
    setError(null);
    confirmImport.mutate(
      {
        items: extractedItems.map(({ confidence, ...item }) => item),
        sourceType,
        sourceUrl,
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err.message || 'Failed to import items'),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-sp-bg border border-white-10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white-10">
          <h2 className="text-lg font-bold text-white-100">Import Data</h2>
          <button onClick={onClose} className="p-1 text-white-40 hover:text-white-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-2 border-b border-white-10">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  tab === t.key
                    ? 'bg-accent-green-110 text-sp-surface'
                    : 'bg-white-5 text-white-60 hover:bg-white-10'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* URL Tab */}
          {tab === 'url' && extractedItems.length === 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white-60 mb-1.5">Website URL</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/about"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
                />
              </div>
              <div>
                <label className="block text-xs text-white-60 mb-1.5">Hint (optional)</label>
                <textarea
                  value={urlHint}
                  onChange={(e) => setUrlHint(e.target.value)}
                  placeholder="e.g. Extract testimonials and statistics from this page"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none placeholder:text-white-30"
                />
              </div>
              <button
                onClick={handleExtractUrl}
                disabled={!url || isExtracting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importUrl.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Extract
              </button>
            </div>
          )}

          {/* Text Tab */}
          {tab === 'text' && extractedItems.length === 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white-60 mb-1.5">Paste your content</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste testimonials, stats, company info, product details..."
                  rows={8}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none placeholder:text-white-30"
                />
              </div>
              <div>
                <label className="block text-xs text-white-60 mb-1.5">Hint (optional)</label>
                <textarea
                  value={textHint}
                  onChange={(e) => setTextHint(e.target.value)}
                  placeholder="e.g. These are customer reviews from our website"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none placeholder:text-white-30"
                />
              </div>
              <button
                onClick={handleExtractText}
                disabled={text.length < 10 || isExtracting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importText.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Extract
              </button>
            </div>
          )}

          {/* CSV Tab */}
          {tab === 'csv' && extractedItems.length === 0 && (
            <div className="space-y-3">
              {csvStep === 'upload' && (
                <div>
                  <label className="block text-xs text-white-60 mb-1.5">Upload CSV file</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                    className="flex items-center gap-2 px-4 py-8 w-full rounded-xl border-2 border-dashed border-white-10 text-white-40 text-sm hover:border-white-20 hover:text-white-60 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Click to select a CSV file (max 5MB)
                  </button>
                  {csvPreview.isPending && (
                    <div className="flex items-center gap-2 mt-2 text-white-40 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing CSV...
                    </div>
                  )}
                </div>
              )}

              {csvStep === 'map' && csvHeaders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white-60">
                      {csvRowCount} rows found. Map columns to data fields:
                    </p>
                    <button
                      onClick={() => {
                        setCsvStep('upload');
                        setCsvContent('');
                        setCsvHeaders([]);
                        setCsvMapping({});
                      }}
                      className="text-xs text-white-40 hover:text-white-60"
                    >
                      Change file
                    </button>
                  </div>
                  {(['title', 'summary', 'type', 'tags', 'priority'] as const).map((field) => (
                    <div key={field} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-white-60 capitalize">{field}</span>
                      <select
                        value={(csvMapping as Record<string, string>)[field] || ''}
                        onChange={(e) =>
                          setCsvMapping((prev) => ({
                            ...prev,
                            [field]: e.target.value || undefined,
                          }))
                        }
                        className="flex-1 px-2 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
                      >
                        <option value="">— skip —</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <button
                    onClick={handleCSVExtract}
                    disabled={!csvMapping.title || isExtracting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {csvExtract.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                    Extract Items
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Google Sheets Tab */}
          {tab === 'sheets' && extractedItems.length === 0 && (
            <div className="space-y-3">
              {!sheetsIntegrations || sheetsIntegrations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white-40 text-sm mb-3">
                    No Google Sheets account connected.
                  </p>
                  <a
                    href={`/clients/${clientId}/settings/integrations`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-10 text-white-60 font-semibold text-sm hover:bg-white-20 transition-colors"
                  >
                    Connect Google Sheets
                  </a>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-white-60 mb-1.5">Account</label>
                    <select
                      value={sheetsIntegrationId}
                      onChange={(e) => {
                        setSheetsIntegrationId(e.target.value);
                        setSpreadsheetId('');
                      }}
                      className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
                    >
                      <option value="">Select account</option>
                      {sheetsIntegrations.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name || String((i.config as Record<string, unknown>)?.email ?? '') || i.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {sheetsIntegrationId && (
                    <div>
                      <label className="block text-xs text-white-60 mb-1.5">Spreadsheet</label>
                      <select
                        value={spreadsheetId}
                        onChange={(e) => setSpreadsheetId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
                      >
                        <option value="">Select spreadsheet</option>
                        {spreadsheets?.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {spreadsheetId && (
                    <>
                      <div>
                        <label className="block text-xs text-white-60 mb-1.5">
                          Sheet/Tab name (optional)
                        </label>
                        <input
                          value={sheetName}
                          onChange={(e) => setSheetName(e.target.value)}
                          placeholder="Sheet1"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white-60 mb-1.5">Hint (optional)</label>
                        <textarea
                          value={sheetsHint}
                          onChange={(e) => setSheetsHint(e.target.value)}
                          placeholder="e.g. This sheet contains customer testimonials"
                          rows={2}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none placeholder:text-white-30"
                        />
                      </div>
                      <button
                        onClick={handleExtractSheets}
                        disabled={isExtracting}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {importSheets.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4" />
                        )}
                        Extract
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Notion Tab */}
          {tab === 'notion' && extractedItems.length === 0 && (
            <div className="space-y-3">
              {!notionIntegrations || notionIntegrations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white-40 text-sm mb-3">No Notion account connected.</p>
                  <a
                    href={`/clients/${clientId}/settings/integrations`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-10 text-white-60 font-semibold text-sm hover:bg-white-20 transition-colors"
                  >
                    Connect Notion
                  </a>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-white-60 mb-1.5">Account</label>
                    <select
                      value={notionIntegrationId}
                      onChange={(e) => setNotionIntegrationId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
                    >
                      <option value="">Select account</option>
                      {notionIntegrations.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name || i.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {notionIntegrationId && (
                    <>
                      <div>
                        <label className="block text-xs text-white-60 mb-1.5">Hint (optional)</label>
                        <textarea
                          value={notionHint}
                          onChange={(e) => setNotionHint(e.target.value)}
                          placeholder="e.g. This database contains product information"
                          rows={2}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none placeholder:text-white-30"
                        />
                      </div>
                      <button
                        onClick={handleExtractNotion}
                        disabled={isExtracting}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {importNotion.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                        Extract
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Extraction loading state */}
          {isExtracting && extractedItems.length === 0 && tab !== 'csv' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent-green-110" />
              <p className="text-white-40 text-sm">Analyzing content with AI...</p>
            </div>
          )}

          {/* Preview section */}
          {extractedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white-100">
                  Extracted Items ({extractedItems.length})
                </h3>
                <button
                  onClick={() => {
                    setExtractedItems([]);
                    if (tab === 'csv') setCsvStep('upload');
                  }}
                  className="text-xs text-white-40 hover:text-white-60 transition-colors"
                >
                  Start over
                </button>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {extractedItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl border border-white-10 bg-white-5"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={item.type}
                          onChange={(e) => updateItemType(i, e.target.value as DataItemType)}
                          className="px-2 py-1 rounded-md bg-white-10 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
                        >
                          {TYPE_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        {item.confidence >= 0.8 && (
                          <span className="flex items-center gap-1 text-[10px] text-green-400">
                            <Check className="w-3 h-3" />
                            High confidence
                          </span>
                        )}
                        {item.confidence > 0 && item.confidence < 0.5 && (
                          <span className="text-[10px] text-yellow-400">Low confidence</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white-100 truncate">{item.title}</p>
                      {item.summary && (
                        <p className="text-xs text-white-40 line-clamp-2">{item.summary}</p>
                      )}
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag, ti) => (
                            <span
                              key={ti}
                              className="px-1.5 py-0.5 rounded bg-white-10 text-white-40 text-[10px]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(i)}
                      className="p-1 text-white-30 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Confirm bar */}
        {extractedItems.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white-10">
            <p className="text-xs text-white-40">
              {extractedItems.length} item{extractedItems.length !== 1 ? 's' : ''} ready to import
            </p>
            <button
              onClick={handleConfirmImport}
              disabled={confirmImport.isPending || extractedItems.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmImport.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Import {extractedItems.length} item{extractedItems.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
