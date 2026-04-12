'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  useSlackConnection,
  useSaveSlackConnection,
  useUpdateSlackEvents,
  useToggleSlackActive,
  useDeleteSlackConnection,
  useTestSlack,
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
  useMediaImportCallback,
  useMediaImportFiles,
  useMediaImportFile,
  useMediaImportDisconnect,
  type Integration,
  type MediaImportFile,
} from '@/hooks/useIntegrations';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const SLACK_EVENTS = [
  { key: 'POST_PUBLISHED', label: 'Post published' },
  { key: 'POST_FAILED', label: 'Post failed' },
  { key: 'BATCH_COMPLETE', label: 'Batch complete' },
  { key: 'CONNECTION_EXPIRED', label: 'Connection expired' },
];

const WEBHOOK_EVENTS = SLACK_EVENTS;

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

// ── Slack Section ─────────────────────────────────────────────────────

function SlackSection() {
  const { data: conn, isLoading } = useSlackConnection();
  const save = useSaveSlackConnection();
  const updateEvents = useUpdateSlackEvents();
  const toggleActive = useToggleSlackActive();
  const remove = useDeleteSlackConnection();
  const test = useTestSlack();

  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [editing, setEditing] = useState(false);

  if (isLoading) return <LoadingSpinner size="sm" />;

  const showForm = editing || !conn;

  const handleSave = () => {
    if (!webhookUrl.trim()) return;
    save.mutate(
      { webhookUrl: webhookUrl.trim(), channelName: channelName.trim() || undefined },
      { onSuccess: () => setEditing(false) },
    );
  };

  const toggleEvent = (key: string) => {
    if (!conn) return;
    const events = conn.subscribedEvents;
    const next = events.includes(key)
      ? events.filter((e) => e !== key)
      : [...events, key];
    updateEvents.mutate(next);
  };

  return (
    <section>
      <h2 className="text-base font-semibold text-white-100 mb-4">Slack</h2>
      <div className="space-y-3">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center">
                <Hash className="w-4.5 h-4.5 text-accent-green-110" />
              </div>
              <div>
                <p className="text-sm font-medium text-white-100">Slack notifications</p>
                <p className="text-xs text-white-40">
                  {conn
                    ? `Connected${conn.channelName ? ` — #${conn.channelName}` : ''}`
                    : 'Paste an incoming webhook URL to connect'}
                </p>
              </div>
            </div>
            {conn && (
              <Toggle
                checked={conn.isActive}
                onChange={() => toggleActive.mutate(!conn.isActive)}
              />
            )}
          </div>

          {showForm && (
            <div className="mt-3 ml-12 space-y-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="input w-full text-sm font-mono"
              />
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Channel name (optional)"
                className="input w-full text-sm"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="btn-primary text-sm px-4">
                  {save.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                </button>
                {conn && (
                  <button
                    onClick={() => setEditing(false)}
                    className="text-sm text-white-40 hover:text-white-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {conn && !editing && (
            <div className="mt-3 ml-12 flex gap-2">
              <button
                onClick={() => {
                  setWebhookUrl(conn.webhookUrl);
                  setChannelName(conn.channelName || '');
                  setEditing(true);
                }}
                className="text-xs text-accent-green-110 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => test.mutate()}
                className="text-xs text-accent-green-110 hover:underline flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                {test.isPending ? 'Sending...' : 'Test'}
              </button>
              {test.isSuccess && (
                <span className="text-xs text-green-400">Sent!</span>
              )}
              <button
                onClick={() => remove.mutate()}
                className="text-xs text-red-400 hover:underline"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {conn?.isActive && (
          <div className="space-y-1 ml-1">
            {SLACK_EVENTS.map((evt) => {
              const enabled = conn.subscribedEvents.includes(evt.key);
              return (
                <div
                  key={evt.key}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white-5 transition-colors"
                >
                  <p className="text-sm font-medium text-white-100">{evt.label}</p>
                  <Toggle checked={enabled} onChange={() => toggleEvent(evt.key)} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
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

const INTEGRATION_META: Record<string, { label: string; icon: typeof Database; description: string; fields: { key: string; label: string; placeholder: string; type?: string }[] }> = {
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
  google_sheets: {
    label: 'Google Sheets',
    icon: FileSpreadsheet,
    description: 'Append event rows to a spreadsheet',
    fields: [
      { key: 'serviceAccountEmail', label: 'Service Account Email', placeholder: 'name@project.iam.gserviceaccount.com' },
      { key: 'privateKey', label: 'Private Key (PEM)', placeholder: '-----BEGIN PRIVATE KEY-----...', type: 'password' },
      { key: 'spreadsheetId', label: 'Spreadsheet ID', placeholder: '1BxiMVs0XRA5nFMdKvBd...' },
      { key: 'sheetName', label: 'Sheet Name', placeholder: 'Sheet1' },
    ],
  },
};

function GenericIntegrationsSection() {
  const { data: integrations, isLoading } = useGenericIntegrations();
  const create = useCreateIntegration();
  const update = useUpdateIntegration();
  const remove = useDeleteIntegration();
  const testInt = useTestIntegration();

  const [adding, setAdding] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) return <LoadingSpinner size="sm" />;

  const handleCreate = (type: string) => {
    if (!formName.trim()) return;
    create.mutate(
      { type, name: formName.trim(), config: formConfig },
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
          return (
            <button
              key={type}
              onClick={() => startAdding(type)}
              className="card p-4 text-left hover:border-accent-green-110/30 transition-colors"
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

      {/* Add form */}
      {adding && INTEGRATION_META[adding] && (
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
  onDelete,
  onTest,
  testing,
}: {
  integration: Integration;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: (v: boolean) => void;
  onDelete: () => void;
  onTest: () => void;
  testing: boolean;
}) {
  const { data: logs } = useIntegrationLogs(expanded ? integration.id : '');
  const retry = useRetryIntegration();

  const meta = INTEGRATION_META[integration.type];
  const Icon = meta?.icon ?? Blocks;
  const typeLabel = meta?.label ?? integration.type;

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
            <p className="text-xs text-white-40">{typeLabel}</p>
          </div>
        </div>
        <Toggle
          checked={integration.isActive}
          onChange={() => onToggleActive(!integration.isActive)}
        />
      </div>

      <div className="flex gap-2 ml-12">
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
  const searchParams = useSearchParams();
  const { data: integrations, isLoading } = useGenericIntegrations();
  const connect = useMediaImportConnect();
  const callback = useMediaImportCallback();
  const disconnect = useMediaImportDisconnect();
  const [browsing, setBrowsing] = useState<string | null>(null);

  // Handle OAuth callback (code + state in URL)
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (code && state) {
      callback.mutate(
        { code, state },
        {
          onSuccess: () => {
            // Clean URL params
            window.history.replaceState({}, '', window.location.pathname);
          },
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (isLoading) return <LoadingSpinner size="sm" />;

  const driveInt = integrations?.find((i) => i.type === 'google_drive' && i.isActive);
  const dropboxInt = integrations?.find((i) => i.type === 'dropbox' && i.isActive);

  const handleConnect = (provider: 'google_drive' | 'dropbox') => {
    connect.mutate(provider, {
      onSuccess: (data) => {
        window.location.href = data.authUrl;
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
      <SlackSection />
      <WebhooksSection />
      <GenericIntegrationsSection />
      <MediaImportSection />
    </div>
  );
}
