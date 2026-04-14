'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Database,
  Send,
  Zap,
  Clock,
  Link as LinkIcon,
  Upload,
  Sparkles,
  Globe,
  CheckCircle,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  useTechStack,
  useSaveManualConnection,
  type TechStackViewItem,
  type ManualSetupField,
} from '@/hooks/useSquadpitch';

// ── Group config ──────────────────────────────────────────────────────

const GROUP_META = [
  {
    key: 'importData' as const,
    label: 'Import Your Data',
    icon: Database,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/20',
  },
  {
    key: 'publishContent' as const,
    label: 'Publish Your Content',
    icon: Send,
    color: 'text-accent-green-110',
    bgColor: 'bg-accent-green-110/20',
  },
  {
    key: 'enhanceWorkflow' as const,
    label: 'Enhance Your Workflow',
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
  },
];

// ── Status badge ──────────────────────────────────────────────────────

const BADGE_STYLES: Record<TechStackViewItem['statusBadge'], string> = {
  'Coming Soon': 'bg-white-10 text-white-30',
  'Connected': 'bg-accent-green-110/10 text-accent-green-110',
  'Connect': 'bg-accent-green-110/10 text-accent-green-110',
  'Add Data': 'bg-blue-500/10 text-blue-400',
};

function StatusBadge({ badge }: { badge: TechStackViewItem['statusBadge'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${BADGE_STYLES[badge]}`}
    >
      {badge === 'Coming Soon' && <Clock className="w-3 h-3" />}
      {badge === 'Connected' && <CheckCircle className="w-3 h-3" />}
      {badge === 'Connect' && <LinkIcon className="w-3 h-3" />}
      {badge === 'Add Data' && <Upload className="w-3 h-3" />}
      {badge}
    </span>
  );
}

// ── Card styling helpers ─────────────────────────────────────────────

function cardClass(item: TechStackViewItem): string {
  if (item.connectionStatus === 'connected') {
    return 'card p-4 border-l-2 border-l-accent-green-110';
  }
  if (item.statusBadge === 'Coming Soon') {
    return 'card p-4 opacity-60';
  }
  return 'card p-4';
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Extract a display-friendly summary from saved metadata (e.g. domain from URL). */
function getMetadataSummary(
  fields: ManualSetupField[],
  metadataJson: Record<string, unknown> | null,
): string | null {
  if (!metadataJson) return null;
  for (const field of fields) {
    const value = metadataJson[field.key];
    if (typeof value !== 'string' || !value) continue;
    if (field.type === 'url') {
      try { return new URL(value).hostname; } catch { return value; }
    }
    return value;
  }
  return null;
}

// ── Manual setup card (config-driven) ────────────────────────────────

function ManualSetupCard({
  item,
  clientId,
}: {
  item: TechStackViewItem;
  clientId: string;
}) {
  const fields = item.manualSetup!.fields;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, ''])),
  );
  const [error, setError] = useState<string | null>(null);
  const save = useSaveManualConnection(clientId, item.providerKey);

  const isConnected = item.connectionStatus === 'connected';
  const summary = isConnected ? getMetadataSummary(fields, item.metadataJson) : null;

  const updateField = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSave = () => {
    for (const field of fields) {
      if (field.required && !values[field.key]?.trim()) {
        setError(`${field.label} is required.`);
        return;
      }
    }
    setError(null);
    save.mutate(values, {
      onSuccess: () => {
        setEditing(false);
        setValues(Object.fromEntries(fields.map((f) => [f.key, ''])));
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to save');
      },
    });
  };

  const actionLabel = fields[0]?.type === 'url' ? 'Add Website' : 'Set Up';
  const ActionIcon = fields[0]?.type === 'url' ? Globe : LinkIcon;

  return (
    <div className={`${cardClass(item)} space-y-2`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-medium text-white-100">{item.label}</p>
            {item.priority === 'core' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent-green-110/10 text-accent-green-110">
                Core
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-white-40">{item.description}</p>
          )}
          {isConnected && summary && (
            <p className="text-xs text-accent-green-110 mt-1 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {summary}
            </p>
          )}
        </div>

        {isConnected ? (
          <StatusBadge badge="Connected" />
        ) : !editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-green-110/10 text-accent-green-110 hover:bg-accent-green-110/20 transition-colors"
          >
            <ActionIcon className="w-3 h-3" />
            {actionLabel}
          </button>
        ) : null}
      </div>

      {editing && !isConnected && (
        <div className="space-y-2 pt-1">
          {fields.map((field, i) => (
            <input
              key={field.key}
              type={field.type === 'url' ? 'url' : 'text'}
              value={values[field.key] ?? ''}
              onChange={(e) => updateField(field.key, e.target.value)}
              placeholder={field.placeholder ?? field.label}
              className="input w-full text-sm"
              autoFocus={i === 0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          ))}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={save.isPending}
              className="px-3 py-1.5 rounded-lg bg-accent-green-110 text-sp-surface text-xs font-semibold hover:bg-accent-green-120 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {save.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setValues(Object.fromEntries(fields.map((f) => [f.key, ''])));
                setError(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Generic card ─────────────────────────────────────────────────────

function TechStackCard({ item }: { item: TechStackViewItem }) {
  return (
    <div className={`${cardClass(item)} flex items-start gap-3`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-white-100">{item.label}</p>
          {item.priority === 'core' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent-green-110/10 text-accent-green-110">
              Core
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-white-40">{item.description}</p>
        )}
      </div>
      <StatusBadge badge={item.statusBadge} />
    </div>
  );
}

// ── Channel-mapped card ──────────────────────────────────────────────

function ChannelCard({
  item,
  clientId,
}: {
  item: TechStackViewItem;
  clientId: string;
}) {
  const isConnected = item.connectionStatus === 'connected';
  const displayName =
    item.metadataJson && typeof item.metadataJson.displayName === 'string'
      ? item.metadataJson.displayName
      : null;

  return (
    <div className={`${cardClass(item)} flex items-start gap-3`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-white-100">{item.label}</p>
          {item.priority === 'core' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent-green-110/10 text-accent-green-110">
              Core
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-white-40">{item.description}</p>
        )}
        {isConnected && displayName && (
          <p className="text-xs text-accent-green-110 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {displayName}
          </p>
        )}
      </div>

      {isConnected ? (
        <StatusBadge badge="Connected" />
      ) : (
        <Link
          href={`/workspaces/${clientId}/settings/channels`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-green-110/10 text-accent-green-110 hover:bg-accent-green-110/20 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Connect
        </Link>
      )}
    </div>
  );
}

// ── Group ─────────────────────────────────────────────────────────────

function TechStackGroup({
  label,
  icon: Icon,
  color,
  bgColor,
  items,
  clientId,
}: {
  label: string;
  icon: typeof Database;
  color: string;
  bgColor: string;
  items: TechStackViewItem[];
  clientId: string;
}) {
  if (items.length === 0) return null;

  const activeInGroup = items.filter((i) => i.connectionStatus === 'connected').length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-md ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
        <h3 className="text-xs font-semibold text-white-60 uppercase tracking-wider">
          {label}
        </h3>
        {activeInGroup > 0 && (
          <span className="text-[10px] font-medium text-accent-green-110 ml-auto">
            {activeInGroup} ready
          </span>
        )}
      </div>
      <div className="space-y-2">
        {items.map((item) =>
          item.channelRef ? (
            <ChannelCard key={item.providerKey} item={item} clientId={clientId} />
          ) : item.manualSetup?.fields?.length ? (
            <ManualSetupCard key={item.providerKey} item={item} clientId={clientId} />
          ) : (
            <TechStackCard key={item.providerKey} item={item} />
          ),
        )}
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────

export function TechStackSection({ clientId }: { clientId: string }) {
  const techStack = useTechStack(clientId);

  if (!techStack) return null;

  const hasItems =
    techStack.importData.length > 0 ||
    techStack.publishContent.length > 0 ||
    techStack.enhanceWorkflow.length > 0;

  if (!hasItems) return null;

  const { activeCount, totalCount } = techStack;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-accent-green-110" />
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
          Your Marketing System
        </h2>
        <span className="text-xs text-white-40 ml-auto">
          {activeCount} of {totalCount} tools ready
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-white-10 mb-3">
        <div
          className="h-1 rounded-full bg-accent-green-110 transition-all duration-500"
          style={{ width: `${totalCount > 0 ? (activeCount / totalCount) * 100 : 0}%` }}
        />
      </div>

      <p className="text-xs text-white-40 mb-4">
        Connect your tools to import data, publish content, and automate your workflow.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {GROUP_META.map(({ key, label, icon, color, bgColor }) => (
          <TechStackGroup
            key={key}
            label={label}
            icon={icon}
            color={color}
            bgColor={bgColor}
            items={techStack[key]}
            clientId={clientId}
          />
        ))}
      </div>
    </div>
  );
}
