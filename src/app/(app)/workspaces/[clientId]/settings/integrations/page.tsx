'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Hash,
  Webhook,
  Plus,
  Trash2,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Database,
  FileSpreadsheet,
  Blocks,
  MessageSquare,
  HardDrive,
  Cloud,
  Folder,
  FileImage,
  FileVideo,
  File,
  Download,
  ExternalLink,
  Unplug,
  Building2,
  Mail,
  Radio,
  Globe,
  PenTool,
  ChevronDown,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useWebhookLogs,
  useTestWebhook,
  useGenericIntegrations,
  useCreateIntegration,
  useUpdateIntegration,
  useDeleteIntegration,
  useIntegrationLogs,
  useTestIntegration,
  useRetryIntegration,
  useMediaImportConnect,
  useMediaImportFiles,
  useMediaImportFile,
  useMediaImportDisconnect,
  useSheetsSpreadsheets,
  type Integration,
  type MediaImportFile,
} from '@/hooks/useIntegrations';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const INTEGRATION_EVENTS = [
  { key: 'POST_PUBLISHED', label: 'Post published' },
  { key: 'POST_FAILED', label: 'Post failed' },
  { key: 'BATCH_COMPLETE', label: 'Batch complete' },
  { key: 'CONNECTION_EXPIRED', label: 'Connection expired' },
];

const WEBHOOK_EVENTS = INTEGRATION_EVENTS;

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
        checked ? 'bg-accent-green-110' : 'bg-white-10'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ── Webhooks Section ──────────────────────────────────────────────────

function WebhooksSection() {
  const { data: webhooks, isLoading } = useWebhooks();
  const create = useCreateWebhook();
  const update = useUpdateWebhook();
  const remove = useDeleteWebhook();
  const testHook = useTestWebhook();

  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) return <LoadingSpinner size="sm" />;

  const handleCreate = () => {
    if (!newUrl.trim()) return;
    create.mutate(
      { targetUrl: newUrl.trim() },
      {
        onSuccess: (wh) => {
          setCreatedSecret(wh.secret || null);
          setNewUrl('');
          setAdding(false);
        },
      },
    );
  };

  const toggleEvent = (webhookId: string, events: string[], key: string) => {
    const next = events.includes(key)
      ? events.filter((e) => e !== key)
      : [...events, key];
    update.mutate({ id: webhookId, subscribedEvents: next });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white-100">Webhooks</h2>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add webhook
        </button>
      </div>

      {createdSecret && (
        <div className="card p-4 mb-3 border-accent-green-110/30">
          <p className="text-sm font-medium text-white-100 mb-1">Signing secret (copy now):</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-accent-green-110 bg-white-5 px-2 py-1 rounded font-mono break-all">
              {createdSecret}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdSecret);
              }}
              className="text-white-40 hover:text-white-100"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setCreatedSecret(null)}
            className="text-xs text-white-40 hover:underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {adding && (
        <div className="card p-4 mb-3 space-y-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="input w-full text-sm font-mono"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary text-sm px-4">
              {create.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-sm text-white-40 hover:text-white-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {!webhooks || webhooks.length === 0 ? (
          <div className="card p-6 text-center text-sm text-white-40">
            No webhooks configured.
          </div>
        ) : (
          webhooks.map((wh) => (
            <WebhookCard
              key={wh.id}
              webhook={wh}
              expanded={expandedId === wh.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === wh.id ? null : wh.id)
              }
              onToggleActive={(active) =>
                update.mutate({ id: wh.id, isActive: active })
              }
              onToggleEvent={(key) =>
                toggleEvent(wh.id, wh.subscribedEvents, key)
              }
              onDelete={() => remove.mutate(wh.id)}
              onTest={() => testHook.mutate(wh.id)}
              testing={testHook.isPending}
            />
          ))
        )}
      </div>
    </section>
  );
}

function WebhookCard({
  webhook,
  expanded,
  onToggleExpand,
  onToggleActive,
  onToggleEvent,
  onDelete,
  onTest,
  testing,
}: {
  webhook: { id: string; targetUrl: string; isActive: boolean; subscribedEvents: string[] };
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: (v: boolean) => void;
  onToggleEvent: (key: string) => void;
  onDelete: () => void;
  onTest: () => void;
  testing: boolean;
}) {
  const { data: logs } = useWebhookLogs(expanded ? webhook.id : '');

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
            <Webhook className="w-4.5 h-4.5 text-accent-green-110" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-mono text-white-100 truncate">
              {webhook.targetUrl}
            </p>
          </div>
        </div>
        <Toggle
          checked={webhook.isActive}
          onChange={() => onToggleActive(!webhook.isActive)}
        />
      </div>

      <div className="flex gap-2 ml-12">
        <button
          onClick={onToggleExpand}
          className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
        >
          {expanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {expanded ? 'Hide' : 'Details'}
        </button>
        <button
          onClick={onTest}
          className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
        >
          <Send className="w-3 h-3" />
          {testing ? 'Sending...' : 'Test'}
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-red-400 hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>

      {expanded && (
        <div className="ml-12 space-y-3">
          {/* Event toggles */}
          <div className="space-y-1">
            <p className="text-xs text-white-40 uppercase tracking-wider mb-1">
              Subscribed events
            </p>
            {WEBHOOK_EVENTS.map((evt) => {
              const enabled = webhook.subscribedEvents.includes(evt.key);
              return (
                <div
                  key={evt.key}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white-5"
                >
                  <p className="text-sm text-white-100">{evt.label}</p>
                  <Toggle checked={enabled} onChange={() => onToggleEvent(evt.key)} />
                </div>
              );
            })}
          </div>

          {/* Delivery logs */}
          {logs && logs.length > 0 && (
            <div>
              <p className="text-xs text-white-40 uppercase tracking-wider mb-1">
                Recent deliveries
              </p>
              <div className="space-y-1">
                {logs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white-5 text-xs"
                  >
                    {log.status === 'success' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-white-100">{log.eventType}</span>
                    {log.responseStatus && (
                      <span className="text-white-40">{log.responseStatus}</span>
                    )}
                    <span className="text-white-30 ml-auto">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Generic Integrations Section ─────────────────────────────────────

interface IntegrationMeta {
  label: string;
  icon: typeof Database;
  description: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  oauth?: 'google_drive' | 'dropbox' | 'google_sheets';
}

const INTEGRATION_META: Record<string, IntegrationMeta> = {
  slack: {
    label: 'Slack',
    icon: Hash,
    description: 'Send notifications to a Slack channel',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
      { key: 'channelName', label: 'Channel Name', placeholder: '#general (optional)' },
    ],
  },
  google_sheets: {
    label: 'Google Sheets',
    icon: FileSpreadsheet,
    description: 'Append event rows to a spreadsheet',
    fields: [],
    oauth: 'google_sheets',
  },
  discord: {
    label: 'Discord',
    icon: MessageSquare,
    description: 'Send notifications to a Discord channel',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...' },
    ],
  },
  notion: {
    label: 'Notion',
    icon: Database,
    description: 'Log events to a Notion database',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'ntn_...', type: 'password' },
      { key: 'databaseId', label: 'Database ID', placeholder: '8a2b3c4d...' },
    ],
  },
  hubspot: {
    label: 'HubSpot',
    icon: Building2,
    description: 'Log activity to HubSpot CRM',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'pat-na1-...', type: 'password' },
    ],
  },
  mailchimp: {
    label: 'Mailchimp',
    icon: Mail,
    description: 'Create draft email campaigns',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'xxxxxxxx-us21', type: 'password' },
      { key: 'serverPrefix', label: 'Server Prefix', placeholder: 'us21' },
      { key: 'listId', label: 'Audience/List ID', placeholder: 'abc123def4' },
    ],
  },
  convertkit: {
    label: 'ConvertKit',
    icon: Radio,
    description: 'Create draft email broadcasts',
    fields: [
      { key: 'apiSecret', label: 'API Secret', placeholder: 'xxxxxxxx...', type: 'password' },
    ],
  },
  wordpress: {
    label: 'WordPress',
    icon: Globe,
    description: 'Create draft blog posts',
    fields: [
      { key: 'siteUrl', label: 'Site URL', placeholder: 'https://yoursite.com' },
      { key: 'username', label: 'Username', placeholder: 'admin' },
      { key: 'applicationPassword', label: 'Application Password', placeholder: 'xxxx xxxx xxxx xxxx', type: 'password' },
    ],
  },
  webflow: {
    label: 'Webflow',
    icon: PenTool,
    description: 'Create draft CMS items',
    fields: [
      { key: 'apiToken', label: 'API Token', placeholder: 'xxxxxxxx...', type: 'password' },
      { key: 'collectionId', label: 'Collection ID', placeholder: '6...abc' },
    ],
  },
};

function GenericIntegrationsSection() {
  const qc = useQueryClient();
  const { data: integrations, isLoading } = useGenericIntegrations();
  const create = useCreateIntegration();
  const update = useUpdateIntegration();
  const remove = useDeleteIntegration();
  const testInt = useTestIntegration();
  const oauthConnect = useMediaImportConnect();

  const [adding, setAdding] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Listen for OAuth popup completion (Sheets, etc.) → refresh integrations
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      if (e.origin !== expectedOrigin && e.origin !== window.location.origin) return;
      if (e.data?.type === 'sp-oauth-complete') {
        qc.invalidateQueries({ queryKey: ['integrations'] });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [qc]);

  if (isLoading) return <LoadingSpinner size="sm" />;

  const handleCreate = (type: string) => {
    if (!formName.trim()) return;
    const config: Record<string, unknown> = { ...formConfig };
    // Set default subscribed events for all integrations
    config.subscribedEvents = INTEGRATION_EVENTS.map((e) => e.key);
    create.mutate(
      { type, name: formName.trim(), config },
      {
        onSuccess: () => {
          setAdding(null);
          setFormName('');
          setFormConfig({});
        },
      },
    );
  };

  const startAdding = (type: string) => {
    const meta = INTEGRATION_META[type];
    // OAuth-based integrations open a popup instead of showing a form
    if (meta?.oauth) {
      oauthConnect.mutate(meta.oauth, {
        onSuccess: (data) => {
          window.open(data.authUrl, 'sp-oauth-popup', 'width=600,height=720');
        },
      });
      return;
    }
    setAdding(type);
    setFormName('');
    setFormConfig({});
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white-100">Integrations</h2>
      </div>

      {/* Type cards for adding */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Object.entries(INTEGRATION_META).map(([type, meta]) => {
          const Icon = meta.icon;
          const count = integrations?.filter((i) => i.type === type).length ?? 0;
          // Hide "Add" card for OAuth types that are already connected (only 1 allowed)
          if (meta.oauth && count > 0) return null;
          return (
            <button
              key={type}
              onClick={() => startAdding(type)}
              disabled={!!meta.oauth && oauthConnect.isPending}
              className="card p-4 text-left hover:border-accent-green-110/30 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-accent-green-110" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white-100">{meta.label}</p>
                  <p className="text-xs text-white-40">
                    {count > 0 ? `${count} connected` : meta.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Add form (non-OAuth types only) */}
      {adding && INTEGRATION_META[adding] && !INTEGRATION_META[adding].oauth && (
        <div className="card p-4 mb-4 space-y-3">
          <p className="text-sm font-medium text-white-100">
            Add {INTEGRATION_META[adding].label} integration
          </p>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Integration name"
            className="input w-full text-sm"
          />
          {INTEGRATION_META[adding].fields.map((f) => (
            <input
              key={f.key}
              type={f.type || 'text'}
              value={formConfig[f.key] || ''}
              onChange={(e) => setFormConfig((c) => ({ ...c, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="input w-full text-sm font-mono"
            />
          ))}
          <div className="flex gap-2">
            <button
              onClick={() => handleCreate(adding)}
              className="btn-primary text-sm px-4"
            >
              {create.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
            </button>
            <button
              onClick={() => setAdding(null)}
              className="text-sm text-white-40 hover:text-white-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Integration cards */}
      <div className="space-y-3">
        {integrations && integrations.length > 0 ? (
          integrations.map((int) => (
            <IntegrationCard
              key={int.id}
              integration={int}
              expanded={expandedId === int.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === int.id ? null : int.id)
              }
              onToggleActive={(active) =>
                update.mutate({ id: int.id, isActive: active })
              }
              onUpdateConfig={(config) =>
                update.mutate({ id: int.id, config })
              }
              onDelete={() => remove.mutate(int.id)}
              onTest={() => testInt.mutate(int.id)}
              testing={testInt.isPending}
            />
          ))
        ) : (
          !adding && (
            <div className="card p-6 text-center text-sm text-white-40">
              No integrations configured. Click a type above to add one.
            </div>
          )
        )}
      </div>
    </section>
  );
}

function IntegrationCard({
  integration,
  expanded,
  onToggleExpand,
  onToggleActive,
  onUpdateConfig,
  onDelete,
  onTest,
  testing,
}: {
  integration: Integration;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: (v: boolean) => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onDelete: () => void;
  onTest: () => void;
  testing: boolean;
}) {
  const { data: logs } = useIntegrationLogs(expanded ? integration.id : '');
  const retry = useRetryIntegration();
  const [eventsOpen, setEventsOpen] = useState(false);

  const meta = INTEGRATION_META[integration.type];
  const Icon = meta?.icon ?? Blocks;
  const typeLabel = meta?.label ?? integration.type;

  const config = integration.config as Record<string, unknown>;

  // Event subscriptions (all integration types)
  const subscribedEvents = Array.isArray(config?.subscribedEvents)
    ? (config.subscribedEvents as string[])
    : INTEGRATION_EVENTS.map((e) => e.key);

  const toggleEvent = (key: string) => {
    const next = subscribedEvents.includes(key)
      ? subscribedEvents.filter((e) => e !== key)
      : [...subscribedEvents, key];
    onUpdateConfig({ ...config, subscribedEvents: next });
  };

  // Google Sheets spreadsheet picker
  const sheetsConfigured = integration.type === 'google_sheets' && !!config?.spreadsheetId;
  const { data: spreadsheets, isLoading: spreadsheetsLoading } = useSheetsSpreadsheets(
    integration.type === 'google_sheets' && integration.isActive && !sheetsConfigured
      ? integration.id
      : '',
  );
  const [sheetName, setSheetName] = useState(
    (config?.sheetName as string) ?? 'Sheet1',
  );

  const handleSelectSpreadsheet = (spreadsheetId: string, spreadsheetName: string) => {
    onUpdateConfig({
      ...config,
      spreadsheetId,
      spreadsheetName,
      sheetName: sheetName.trim() || 'Sheet1',
    });
  };

  // Subtitle
  let subtitle = typeLabel;
  if (integration.type === 'slack' && config?.channelName) {
    subtitle += ` — #${config.channelName}`;
  } else if (integration.type === 'google_sheets' && config?.email) {
    subtitle += ` — ${config.email}`;
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4.5 h-4.5 text-accent-green-110" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white-100 truncate">
              {integration.name}
            </p>
            <p className="text-xs text-white-40">{subtitle}</p>
          </div>
        </div>
        <Toggle
          checked={integration.isActive}
          onChange={() => onToggleActive(!integration.isActive)}
        />
      </div>

      <div className="flex gap-2 ml-12">
        {/* Show Sheets link when configured */}
        {sheetsConfigured && (
          <a
            href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            {(config.spreadsheetName as string) ?? 'Open Sheet'}
          </a>
        )}
        <button
          onClick={onToggleExpand}
          className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
        >
          {expanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {expanded ? 'Hide' : 'Logs'}
        </button>
        <button
          onClick={onTest}
          className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
        >
          <Send className="w-3 h-3" />
          {testing ? 'Sending...' : 'Test'}
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-red-400 hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>

      {/* Google Sheets: spreadsheet picker when not yet configured */}
      {integration.type === 'google_sheets' && integration.isActive && !sheetsConfigured && (
        <div className="ml-12 space-y-3">
          <div>
            <label className="text-xs text-white-40 block mb-1">Sheet / Tab Name</label>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Sheet1"
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-white-40 block mb-1">Select a spreadsheet</label>
            {spreadsheetsLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white-40" />
                <span className="text-xs text-white-40">Loading spreadsheets...</span>
              </div>
            ) : spreadsheets && spreadsheets.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {spreadsheets.map((ss) => (
                  <button
                    key={ss.id}
                    onClick={() => handleSelectSpreadsheet(ss.id, ss.name)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white-5 transition-colors text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-accent-green-110 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white-100 truncate">{ss.name}</p>
                      <p className="text-xs text-white-30">
                        {new Date(ss.modifiedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white-40 py-2">
                No spreadsheets found in this Google account.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Event subscriptions (collapsible) */}
      {integration.isActive && (
        <div className="ml-12">
          <button
            onClick={() => setEventsOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-white-40 uppercase tracking-wider hover:text-white-60 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${eventsOpen ? 'rotate-0' : '-rotate-90'}`} />
            Events ({subscribedEvents.length}/{INTEGRATION_EVENTS.length})
          </button>
          {eventsOpen && (
            <div className="mt-1 space-y-0.5">
              {INTEGRATION_EVENTS.map((evt) => (
                <div
                  key={evt.key}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white-5 transition-colors"
                >
                  <p className="text-sm text-white-100">{evt.label}</p>
                  <Toggle
                    checked={subscribedEvents.includes(evt.key)}
                    onChange={() => toggleEvent(evt.key)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="ml-12 space-y-3">
          {/* Delivery logs */}
          {logs && logs.length > 0 ? (
            <div>
              <p className="text-xs text-white-40 uppercase tracking-wider mb-1">
                Recent deliveries
              </p>
              <div className="space-y-1">
                {logs.slice(0, 15).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white-5 text-xs"
                  >
                    {log.status === 'success' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-white-100">{log.eventType}</span>
                    {log.errorMessage && (
                      <span className="text-red-400 truncate max-w-[200px]" title={log.errorMessage}>
                        {log.errorMessage}
                      </span>
                    )}
                    <span className="text-white-30 ml-auto flex-shrink-0">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                    {log.status === 'failed' && (
                      <button
                        onClick={() =>
                          retry.mutate({
                            integrationId: integration.id,
                            logId: log.id,
                          })
                        }
                        className="text-accent-green-110 hover:underline flex items-center gap-0.5 flex-shrink-0"
                        title="Retry"
                      >
                        <RefreshCw className={`w-3 h-3 ${retry.isPending ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-white-40">No deliveries yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Media Import Section (Drive + Dropbox) ───────────────────────────

const MEDIA_PROVIDERS = [
  { type: 'google_drive' as const, label: 'Google Drive', icon: HardDrive },
  { type: 'dropbox' as const, label: 'Dropbox', icon: Cloud },
];

function MediaImportSection() {
  const { clientId } = useParams<{ clientId: string }>();
  const qc = useQueryClient();
  const { data: integrations, isLoading } = useGenericIntegrations();
  const connect = useMediaImportConnect();
  const disconnect = useMediaImportDisconnect();
  const [browsing, setBrowsing] = useState<string | null>(null);

  // Listen for OAuth popup completion → refresh integrations
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      if (e.origin !== expectedOrigin && e.origin !== window.location.origin) return;
      const ch = e.data?.channel?.toUpperCase();
      if (e.data?.type === 'sp-oauth-complete' && (ch === 'DRIVE' || ch === 'DROPBOX')) {
        qc.invalidateQueries({ queryKey: ['integrations'] });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [qc]);

  if (isLoading) return <LoadingSpinner size="sm" />;

  const driveInt = integrations?.find((i) => i.type === 'google_drive' && i.isActive);
  const dropboxInt = integrations?.find((i) => i.type === 'dropbox' && i.isActive);

  const handleConnect = (provider: 'google_drive' | 'dropbox') => {
    connect.mutate(provider, {
      onSuccess: (data) => {
        window.open(data.authUrl, 'sp-oauth-popup', 'width=600,height=720');
      },
    });
  };

  return (
    <section>
      <h2 className="text-base font-semibold text-white-100 mb-4">Media Import</h2>
      <p className="text-sm text-white-40 mb-4">
        Connect cloud storage to browse and import media into your content.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {MEDIA_PROVIDERS.map(({ type, label, icon: Icon }) => {
          const connected = type === 'google_drive' ? driveInt : dropboxInt;
          return (
            <div key={type} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-accent-green-110" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white-100">{label}</p>
                  <p className="text-xs text-white-40">
                    {connected
                      ? `Connected${(connected.config as { email?: string })?.email ? ` — ${(connected.config as { email?: string }).email}` : ''}`
                      : 'Not connected'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {connected ? (
                  <>
                    <button
                      onClick={() => setBrowsing(browsing === connected.id ? null : connected.id)}
                      className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
                    >
                      <Folder className="w-3 h-3" />
                      {browsing === connected.id ? 'Close' : 'Browse files'}
                    </button>
                    <button
                      onClick={() => disconnect.mutate(connected.id)}
                      className="text-xs text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Unplug className="w-3 h-3" />
                      {disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(type)}
                    className="btn-primary text-xs px-3 py-1 flex items-center gap-1"
                  >
                    {connect.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3 h-3" />
                    )}
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* File browser */}
      {browsing && clientId && (
        <FileBrowser integrationId={browsing} clientId={clientId} />
      )}
    </section>
  );
}

function FileBrowser({
  integrationId,
  clientId,
}: {
  integrationId: string;
  clientId: string;
}) {
  const [folderPath, setFolderPath] = useState<{ id?: string; path?: string; name: string }[]>([
    { name: 'Root' },
  ]);
  const current = folderPath[folderPath.length - 1];

  const queryOptions: Record<string, string> = {};
  if (current.id) queryOptions.folderId = current.id;
  if (current.path) queryOptions.path = current.path;

  const { data, isLoading } = useMediaImportFiles(integrationId, queryOptions);
  const importFile = useMediaImportFile();

  const navigateToFolder = useCallback(
    (file: MediaImportFile) => {
      setFolderPath((p) => [
        ...p,
        { id: file.id, path: file.path, name: file.name },
      ]);
    },
    [],
  );

  const navigateUp = useCallback(
    (index: number) => {
      setFolderPath((p) => p.slice(0, index + 1));
    },
    [],
  );

  const handleImport = (file: MediaImportFile) => {
    const fileRef = file.path || file.id;
    importFile.mutate({ integrationId, fileRef, clientId });
  };

  const getFileIcon = (file: MediaImportFile) => {
    if (file.isFolder) return Folder;
    if (file.mimeType?.startsWith('image/')) return FileImage;
    if (file.mimeType?.startsWith('video/')) return FileVideo;
    return File;
  };

  const isImportable = (file: MediaImportFile) => {
    return (
      !file.isFolder &&
      (file.mimeType?.startsWith('image/') || file.mimeType?.startsWith('video/'))
    );
  };

  return (
    <div className="card p-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {folderPath.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-white-30">/</span>}
            <button
              onClick={() => navigateUp(i)}
              className={`text-xs hover:underline ${
                i === folderPath.length - 1
                  ? 'text-white-100 font-medium'
                  : 'text-accent-green-110'
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {data?.files && data.files.length > 0 ? (
            data.files.map((file) => {
              const Icon = getFileIcon(file);
              return (
                <div
                  key={file.id || file.path}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white-5 transition-colors"
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      file.isFolder ? 'text-accent-green-110' : 'text-white-40'
                    }`}
                  />
                  {file.isFolder ? (
                    <button
                      onClick={() => navigateToFolder(file)}
                      className="text-sm text-white-100 hover:text-accent-green-110 text-left truncate"
                    >
                      {file.name}
                    </button>
                  ) : (
                    <span className="text-sm text-white-100 truncate">{file.name}</span>
                  )}
                  <span className="text-xs text-white-30 ml-auto flex-shrink-0">
                    {file.size ? `${(file.size / 1024).toFixed(0)} KB` : ''}
                  </span>
                  {isImportable(file) && (
                    <button
                      onClick={() => handleImport(file)}
                      className="text-xs text-accent-green-110 hover:underline flex items-center gap-1 flex-shrink-0"
                      disabled={importFile.isPending}
                    >
                      {importFile.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      Import
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-white-40 text-center py-4">No files found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <GenericIntegrationsSection />
      <MediaImportSection />
      <WebhooksSection />
    </div>
  );
}
