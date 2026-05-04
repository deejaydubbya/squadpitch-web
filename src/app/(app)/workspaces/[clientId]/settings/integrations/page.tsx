'use client';

import { useState, useEffect } from 'react';
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
  ExternalLink,
  Building2,
  Mail,
  Radio,
  Globe,
  PenTool,
  ChevronDown,
} from 'lucide-react';
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
  useSheetsSpreadsheets,
  type Integration,
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

type IntegrationCategory = 'notifications' | 'publishing' | 'data_logging' | 'email_marketing' | 'crm_tools';

interface IntegrationMeta {
  label: string;
  icon: typeof Database;
  description: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  oauth?: 'google_drive' | 'dropbox' | 'google_sheets';
  category?: IntegrationCategory;
}

const CATEGORY_META: Record<IntegrationCategory, { label: string; description: string }> = {
  notifications: { label: 'Notifications', description: 'Get alerted in Slack, Discord, or other channels when events happen.' },
  publishing: { label: 'Publishing', description: 'Push content to WordPress, Webflow, or other CMS platforms.' },
  data_logging: { label: 'Data & Logging', description: 'Log events to spreadsheets, databases, or knowledge bases.' },
  email_marketing: { label: 'Email Marketing', description: 'Create draft campaigns in Mailchimp, ConvertKit, and more.' },
  crm_tools: { label: 'CRM Tools', description: 'Log activity to your CRM for tracking and reporting.' },
};

const INTEGRATION_META: Record<string, IntegrationMeta> = {
  slack: {
    label: 'Slack',
    icon: Hash,
    description: 'Send notifications to a Slack channel',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
      { key: 'channelName', label: 'Channel Name', placeholder: '#general (optional)' },
    ],
    category: 'notifications',
  },
  discord: {
    label: 'Discord',
    icon: MessageSquare,
    description: 'Send notifications to a Discord channel',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...' },
    ],
    category: 'notifications',
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
    category: 'publishing',
  },
  webflow: {
    label: 'Webflow',
    icon: PenTool,
    description: 'Create draft CMS items',
    fields: [
      { key: 'apiToken', label: 'API Token', placeholder: 'xxxxxxxx...', type: 'password' },
      { key: 'collectionId', label: 'Collection ID', placeholder: '6...abc' },
    ],
    category: 'publishing',
  },
  google_sheets: {
    label: 'Google Sheets',
    icon: FileSpreadsheet,
    description: 'Append event rows to a spreadsheet',
    fields: [],
    oauth: 'google_sheets',
    category: 'data_logging',
  },
  notion: {
    label: 'Notion',
    icon: Database,
    description: 'Log events to a Notion database',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'ntn_...', type: 'password' },
      { key: 'databaseId', label: 'Database ID', placeholder: '8a2b3c4d...' },
    ],
    category: 'data_logging',
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
    category: 'email_marketing',
  },
  convertkit: {
    label: 'ConvertKit',
    icon: Radio,
    description: 'Create draft email broadcasts',
    fields: [
      { key: 'apiSecret', label: 'API Secret', placeholder: 'xxxxxxxx...', type: 'password' },
    ],
    category: 'email_marketing',
  },
  hubspot: {
    label: 'HubSpot',
    icon: Building2,
    description: 'Log activity to HubSpot CRM',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'pat-na1-...', type: 'password' },
    ],
    category: 'crm_tools',
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

  // Filter out cloud storage types from connected integrations list
  const filteredIntegrations = integrations?.filter(
    (i) => i.type !== 'google_drive' && i.type !== 'dropbox'
  );

  // Group INTEGRATION_META entries by category
  const categories = Object.entries(INTEGRATION_META).reduce<
    Record<IntegrationCategory, [string, IntegrationMeta][]>
  >(
    (acc, entry) => {
      const cat = entry[1].category ?? 'notifications';
      acc[cat].push(entry);
      return acc;
    },
    {
      notifications: [],
      publishing: [],
      data_logging: [],
      email_marketing: [],
      crm_tools: [],
    }
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-white-100">Integrations</h2>
      </div>
      <p className="text-sm text-white-40 mb-4">
        Workflow tools and services that extend Squadpitch. Data sources are managed from the Data page.
      </p>

      {/* Type cards grouped by category */}
      {(Object.entries(categories) as [IntegrationCategory, [string, IntegrationMeta][]][]).map(
        ([category, entries]) => {
          if (entries.length === 0) return null;
          const meta = CATEGORY_META[category];
          return (
            <div key={category} className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white-30 mb-0.5">
                {meta.label}
              </p>
              <p className="text-xs text-white-30 mb-2">{meta.description}</p>
              <div className="grid grid-cols-2 gap-3">
                {entries.map(([type, meta]) => {
                  const Icon = meta.icon;
                  const count = filteredIntegrations?.filter((i) => i.type === type).length ?? 0;
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
            </div>
          );
        }
      )}

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
        {filteredIntegrations && filteredIntegrations.length > 0 ? (
          filteredIntegrations.map((int) => (
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
            <div className="card p-6 text-center space-y-1">
              <p className="text-sm text-white-40">No integrations configured yet.</p>
              <p className="text-xs text-white-30">Select a service above to connect it to your workspace.</p>
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


// ── Main Page ─────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-white-100">Integrations</h2>
        <p className="text-sm text-white-40 mt-1">
          Connect third-party services to extend Squadpitch with notifications, publishing, data logging, and more.
        </p>
      </div>
      <GenericIntegrationsSection />
      <WebhooksSection />
    </div>
  );
}
