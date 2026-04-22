'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Circle,
  AlertTriangle,
  Clock,
  Shield,
  Radio,
  Database,
  Settings2,
  Inbox,
} from 'lucide-react';
import {
  useAutopilotSettings,
  useUpdateAutopilotSettings,
  useAutopilotReadiness,
  useAutopilotActivity,
  useAutopilotStatus,
  useAutopilotCampaignRecommendations,
  type AutopilotMode,
  type AutopilotSettings,
  type AutopilotActivityItem,
} from '@/hooks/useSquadpitch';
import { AutopilotCampaignsSection } from '@/components/studio/AutopilotCampaignsSection';
import { AutopilotInboxBanner } from '@/components/studio/AutopilotInboxBanner';
import { cn } from '@/lib/utils';

type AutopilotTab = 'inbox' | 'settings';

const MODE_CONFIG: Record<
  AutopilotMode,
  { label: string; description: string; accent: string }
> = {
  off: {
    label: 'Off',
    description: 'Autopilot is disabled. No drafts are generated automatically.',
    accent: 'border-white-20 text-white-60',
  },
  draft_only: {
    label: 'Draft Only',
    description: 'Autopilot generates drafts for your review. Nothing is published without your approval.',
    accent: 'border-blue-500 text-blue-400',
  },
  schedule_approved: {
    label: 'Schedule Approved',
    description: 'Autopilot generates and schedules drafts. You review before they go live.',
    accent: 'border-yellow-500 text-yellow-400',
  },
  auto_publish: {
    label: 'Auto Publish',
    description: 'Autopilot generates and publishes posts automatically. Use with caution.',
    accent: 'border-green-500 text-green-400',
  },
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  published: 'bg-green-900/30 text-green-400',
  scheduled: 'bg-blue-900/30 text-blue-400',
  generated: 'bg-white-10 text-white-60',
  skipped: 'bg-red-900/30 text-red-400',
  failed: 'bg-red-900/30 text-red-400',
};

const TRIGGER_LABELS: Record<string, string> = {
  new_listing: 'New Listing',
  inactivity_gap: 'Inactivity',
  new_review: 'Review',
  new_milestone: 'Milestone',
  coverage: 'Coverage Gap',
  channel_gap: 'Channel Gap',
};

/** Maps readiness check IDs to settings page paths (relative to workspace base) */
const CHECK_FIX_LINKS: Record<string, string> = {
  channels: 'settings/channels',
  data: 'sources',
  brand: 'settings/brand',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AutopilotPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const base = `/workspaces/${clientId}`;

  const [activeTab, setActiveTab] = useState<AutopilotTab>('inbox');

  const { data: settings, isLoading: settingsLoading } = useAutopilotSettings(clientId);
  const { data: readiness, isLoading: readinessLoading, error: readinessError } = useAutopilotReadiness(clientId);
  const { data: activity } = useAutopilotActivity(clientId);
  const { data: status } = useAutopilotStatus(clientId);
  const { data: campaignData } = useAutopilotCampaignRecommendations(clientId);
  const updateSettings = useUpdateAutopilotSettings(clientId);

  const currentMode = settings?.mode ?? 'off';
  const isEnabled = settings?.enabled && currentMode !== 'off';

  // Actionable count for Inbox tab badge
  const actionableCount = (campaignData?.pendingCount ?? 0) + (campaignData?.readyCount ?? 0);

  const handleModeChange = (mode: AutopilotMode) => {
    const enabled = mode !== 'off';
    updateSettings.mutate({ mode, enabled });
  };

  const handleToggle = (key: string, value: unknown) => {
    updateSettings.mutate({ [key]: value } as Partial<AutopilotSettings>);
  };

  if (settingsLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="h-8 w-48 bg-white-10 rounded animate-pulse" />
        <div className="h-40 bg-white-10 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white-100">Autopilot</h1>
            <p className="text-sm text-white-40">
              Automated content generation and scheduling
            </p>
          </div>
        </div>
        <StatusBadge enabled={isEnabled} ready={readiness?.ready} />
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 border-b border-white-10">
        <button
          onClick={() => setActiveTab('inbox')}
          className={cn(
            'flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'inbox'
              ? 'border-accent-green-110 text-accent-green-110'
              : 'border-transparent text-white-40 hover:text-white-60',
          )}
        >
          <Inbox className="w-4 h-4" />
          Inbox
          {actionableCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-accent-green-110/10 text-accent-green-110">
              {actionableCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            'flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'settings'
              ? 'border-accent-green-110 text-accent-green-110'
              : 'border-transparent text-white-40 hover:text-white-60',
          )}
        >
          <Settings2 className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* ── Inbox Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'inbox' && (
        <>
          <AutopilotInboxBanner clientId={clientId} />
          <AutopilotCampaignsSection clientId={clientId} />
        </>
      )}

      {/* ── Settings Tab ──────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <>
          {/* ── Readiness Checklist (always visible) ─────────────────── */}
          {readinessLoading ? (
            <div className="card p-5 border-white-10">
              <div className="h-4 w-32 bg-white-10 rounded animate-pulse" />
              <div className="mt-3 space-y-2">
                <div className="h-4 w-full bg-white-10 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-white-10 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-white-10 rounded animate-pulse" />
              </div>
            </div>
          ) : readiness ? (
            <div className={cn(
              'card p-5',
              readiness.ready ? 'border-green-500/20' : 'border-yellow-500/20',
            )}>
              <div className="flex items-center gap-2 mb-4">
                {readiness.ready ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
                <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
                  {readiness.ready ? 'Setup Complete' : 'Setup Required'}
                </h2>
              </div>
              <div className="space-y-3">
                {readiness.checks.map((check) => {
                  const fixLink = CHECK_FIX_LINKS[check.id];
                  return (
                    <div key={check.id} className="flex items-start gap-3">
                      {check.met ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', check.met ? 'text-white-60' : 'text-white-100')}>
                          {check.label}
                        </p>
                        {!check.met && (
                          <p className="text-xs text-white-40 mt-0.5">
                            {fixLink ? (
                              <Link href={`${base}/${fixLink}`} className="text-accent-green-110 hover:underline">
                                {check.fix}
                              </Link>
                            ) : (
                              check.fix
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card p-5 border-red-500/20">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
                  Setup Check Unavailable
                </h2>
              </div>
              <p className="text-xs text-white-40 mb-3">
                Could not load readiness status. Please verify the following are set up:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Circle className="w-3.5 h-3.5 text-white-20" />
                  <Link href={`${base}/settings/channels`} className="text-sm text-accent-green-110 hover:underline">
                    At least 1 connected channel
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="w-3.5 h-3.5 text-white-20" />
                  <Link href={`${base}/sources`} className="text-sm text-accent-green-110 hover:underline">
                    Business data available
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="w-3.5 h-3.5 text-white-20" />
                  <Link href={`${base}/settings/brand`} className="text-sm text-accent-green-110 hover:underline">
                    Brand profile configured
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── Mode Selector ─────────────────────────────────────────── */}
          <div className="card p-5 border-white-10">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4 text-accent-green-110" />
              <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
                Operating Mode
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(MODE_CONFIG) as AutopilotMode[]).map((mode) => {
                const cfg = MODE_CONFIG[mode];
                const isActive = currentMode === mode;
                const isAvailable = readiness?.availableModes?.includes(mode) ?? mode === 'off';
                const isDisabled = !isAvailable && mode !== 'off';
                const failingChecks = readiness?.checks.filter((c) => !c.met) ?? [];

                return (
                  <button
                    key={mode}
                    onClick={() => !isDisabled && handleModeChange(mode)}
                    disabled={isDisabled || updateSettings.isPending}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      isActive
                        ? `${cfg.accent} bg-white-5`
                        : isDisabled
                          ? 'border-white-10 opacity-40 cursor-not-allowed'
                          : 'border-white-10 hover:border-white-20 hover:bg-white-5 cursor-pointer',
                    )}
                  >
                    <p className={cn('text-sm font-semibold', isActive ? '' : 'text-white-100')}>
                      {cfg.label}
                    </p>
                    <p className="text-xs text-white-40 mt-1 leading-relaxed">
                      {cfg.description}
                    </p>
                    {isDisabled && failingChecks.length > 0 && (
                      <p className="text-[10px] text-orange-400 mt-2">
                        Missing: {failingChecks.map((c) => c.label).join(', ')}
                      </p>
                    )}
                    {isDisabled && failingChecks.length === 0 && (
                      <p className="text-[10px] text-orange-400 mt-2">
                        Complete setup to unlock
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Channel Permissions ────────────────────────────────────── */}
          {readiness && readiness.connectedChannels.length > 0 && settings && (
            <div className="card p-5 border-white-10">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-4 h-4 text-accent-green-110" />
                <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
                  Channel Permissions
                </h2>
              </div>
              <p className="text-xs text-white-40 mb-3">
                Select which channels Autopilot can create content for.
              </p>
              <div className="space-y-2">
                {readiness.connectedChannels.map((ch) => {
                  const isSelected = settings.preferredChannels?.includes(ch as never) ?? false;
                  return (
                    <label
                      key={ch}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white-5 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const current = settings.preferredChannels ?? [];
                          const next = isSelected
                            ? current.filter((c) => c !== ch)
                            : [...current, ch as never];
                          handleToggle('preferredChannels', next as never);
                        }}
                        className="rounded border-white-20 bg-white-5 text-accent-green-110 focus:ring-accent-green-110 focus:ring-offset-0"
                      />
                      <span className="text-sm text-white-100 font-medium">{ch}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Content Sources ────────────────────────────────────────── */}
          {settings && (
            <div className="card p-5 border-white-10">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-accent-green-110" />
                <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
                  Content Sources
                </h2>
              </div>
              <p className="text-xs text-white-40 mb-3">
                Choose which types of content Autopilot can generate.
              </p>
              <div className="space-y-2">
                {[
                  { key: 'allowListingPosts', label: 'Listings', description: 'Property listings and "Just Listed" posts' },
                  { key: 'allowTestimonialPosts', label: 'Reviews & Testimonials', description: 'Client reviews and testimonial-based posts' },
                  { key: 'allowMilestonePosts', label: 'Milestones', description: '"Just Sold" and achievement celebration posts' },
                  { key: 'allowFallbackPosts', label: 'General / Market Updates', description: 'Market insights, tips, and engagement posts' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white-5 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={settings[item.key as keyof typeof settings] as boolean}
                      onChange={() =>
                        handleToggle(
                          item.key,
                          !(settings[item.key as keyof typeof settings] as boolean),
                        )
                      }
                      className="rounded border-white-20 bg-white-5 text-accent-green-110 focus:ring-accent-green-110 focus:ring-offset-0"
                    />
                    <div>
                      <span className="text-sm text-white-100 font-medium">{item.label}</span>
                      <p className="text-xs text-white-40">{item.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Safety Rules ───────────────────────────────────────────── */}
          {settings && (
            <div className="card p-5 border-white-10">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-accent-green-110" />
                <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
                  Safety Rules
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput
                  label="Max drafts per day"
                  value={settings.maxDraftsPerDay}
                  min={1}
                  max={10}
                  onChange={(v) => handleToggle('maxDraftsPerDay', v)}
                />
                <NumberInput
                  label="Max drafts per week"
                  value={settings.maxDraftsPerWeek}
                  min={1}
                  max={20}
                  onChange={(v) => handleToggle('maxDraftsPerWeek', v)}
                />
                <NumberInput
                  label="Min hours between drafts"
                  value={settings.minimumHoursBetweenDrafts}
                  min={1}
                  max={168}
                  onChange={(v) => handleToggle('minimumHoursBetweenDrafts', v)}
                />
                <NumberInput
                  label="Max per scheduled run"
                  value={settings.maxDraftsPerScheduledRun}
                  min={1}
                  max={5}
                  onChange={(v) => handleToggle('maxDraftsPerScheduledRun', v)}
                />
              </div>
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white-5 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireApprovalBeforePublish}
                    onChange={() =>
                      handleToggle('requireApprovalBeforePublish', !settings.requireApprovalBeforePublish)
                    }
                    className="rounded border-white-20 bg-white-5 text-accent-green-110 focus:ring-accent-green-110 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-sm text-white-100 font-medium">Require approval before publish</span>
                    <p className="text-xs text-white-40">All autopilot drafts need manual approval</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white-5 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.skipChannelsWithoutMedia}
                    onChange={() =>
                      handleToggle('skipChannelsWithoutMedia', !settings.skipChannelsWithoutMedia)
                    }
                    className="rounded border-white-20 bg-white-5 text-accent-green-110 focus:ring-accent-green-110 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-sm text-white-100 font-medium">Skip channels without media</span>
                    <p className="text-xs text-white-40">Don&apos;t generate for channels that require images if none available</p>
                  </div>
                </label>
              </div>

              {/* Quiet hours */}
              <div className="mt-4 border-t border-white-10 pt-4">
                <p className="text-sm text-white-100 font-medium mb-2">Quiet Hours (UTC)</p>
                <p className="text-xs text-white-40 mb-3">
                  Autopilot won&apos;t generate drafts during these hours.
                </p>
                <div className="flex items-center gap-3">
                  <HourSelect
                    label="Start"
                    value={settings.quietHoursStart}
                    onChange={(v) => handleToggle('quietHoursStart', v)}
                  />
                  <span className="text-white-40">to</span>
                  <HourSelect
                    label="End"
                    value={settings.quietHoursEnd}
                    onChange={(v) => handleToggle('quietHoursEnd', v)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Recent Activity ────────────────────────────────────────── */}
          <div className="card p-5 border-white-10">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-accent-green-110" />
              <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
                Recent Activity
              </h2>
              {status && (
                <span className="ml-auto text-xs text-white-40">
                  {status.draftsThisWeek} / {status.maxDraftsPerWeek} this week
                </span>
              )}
            </div>
            {!activity || activity.length === 0 ? (
              <p className="text-xs text-white-40 italic">No recent autopilot activity.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <ActivityRow key={item.id} item={item} base={base} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function StatusBadge({ enabled, ready }: { enabled?: boolean; ready?: boolean }) {
  if (!ready && !enabled) {
    return (
      <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400">
        Setup Required
      </span>
    );
  }
  return (
    <span
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-semibold',
        enabled ? 'bg-green-500/15 text-green-400' : 'bg-white-10 text-white-60',
      )}
    >
      {enabled ? 'Active' : 'Off'}
    </span>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-white-40 block mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          if (!isNaN(v) && v >= min && v <= max) onChange(v);
        }}
        className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-sm text-white-100 focus:outline-none focus:border-accent-green-110"
      />
    </div>
  );
}

function HourSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-white-40 block mb-0.5">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : parseInt(v));
        }}
        className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-sm text-white-100 focus:outline-none focus:border-accent-green-110"
      >
        <option value="">None</option>
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>
            {i.toString().padStart(2, '0')}:00
          </option>
        ))}
      </select>
    </div>
  );
}

function ActivityRow({ item, base }: { item: AutopilotActivityItem; base: string }) {
  return (
    <Link
      href={`${base}/planner`}
      className="flex items-start gap-2 pb-2 border-b border-white-10 last:border-0 last:pb-0 hover:bg-white-5 rounded px-1 -mx-1 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white-80 line-clamp-1 leading-relaxed">
          {item.body || '(no content)'}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-mono',
              EVENT_TYPE_COLORS[item.eventType] ?? 'bg-white-10 text-white-60',
            )}
          >
            {item.eventType}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-white-10 text-[10px] text-white-60 font-mono">
            {item.channel}
          </span>
          {item.trigger && (
            <span className="px-1.5 py-0.5 rounded bg-purple-900/30 text-[10px] text-purple-400 font-mono">
              {TRIGGER_LABELS[item.trigger] ?? item.trigger}
            </span>
          )}
          {item.createdAt && (
            <span className="text-[10px] text-white-40">{formatDate(item.createdAt)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
