'use client';

import { useState } from 'react';
import { Mail, Smartphone, Bell, BellRing, CalendarDays, Loader2, CheckCircle, Clock, XCircle, SkipForward, AlertTriangle, ChevronDown } from 'lucide-react';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useNotificationLogs,
  useTestEmail,
  useTestSms,
  useVapidKey,
  usePushSubscribe,
  usePushUnsubscribe,
  usePushPermissionState,
} from '@/hooks/useNotifications';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const EVENT_TYPES = [
  {
    key: 'POST_PUBLISHED',
    label: 'Post published',
    desc: 'When a post is successfully published to a channel.',
    channels: ['email'],
  },
  {
    key: 'POST_FAILED',
    label: 'Post failed',
    desc: 'When a post fails to publish.',
    channels: ['email', 'sms'],
  },
  {
    key: 'USAGE_LIMIT_NEARING',
    label: 'Usage limit nearing',
    desc: 'When you reach 80% of your monthly plan limit.',
    channels: ['email'],
  },
  {
    key: 'CONNECTION_EXPIRED',
    label: 'Connection expired',
    desc: 'When a channel connection token expires.',
    channels: ['email', 'sms'],
  },
  {
    key: 'BATCH_COMPLETE',
    label: 'Batch complete',
    desc: 'When a batch content generation finishes.',
    channels: ['email'],
  },
];

const INAPP_EVENT_TYPES = [
  { key: 'INAPP_POST_PUBLISHED', label: 'Post published', desc: 'When a post is successfully published.' },
  { key: 'INAPP_POST_FAILED', label: 'Post failed', desc: 'When a post fails to publish.' },
  { key: 'INAPP_USAGE_LIMIT_NEARING', label: 'Usage limit nearing', desc: 'When you reach 80% of your plan limit.' },
  { key: 'INAPP_CONNECTION_EXPIRED', label: 'Connection expired', desc: 'When a channel connection expires.' },
  { key: 'INAPP_BATCH_COMPLETE', label: 'Batch complete', desc: 'When batch generation finishes.' },
];

const PUSH_EVENT_TYPES = [
  { key: 'PUSH_POST_FAILED', label: 'Post failed', desc: 'When a post fails to publish.' },
  { key: 'PUSH_CONNECTION_EXPIRED', label: 'Connection expired', desc: 'When a channel connection expires.' },
  { key: 'PUSH_BATCH_COMPLETE', label: 'Batch complete', desc: 'When batch generation finishes.' },
  { key: 'PUSH_POST_PUBLISHED', label: 'Post published', desc: 'When a post is published.' },
];

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string }> = {
  sent: { icon: CheckCircle, color: 'text-green-400' },
  queued: { icon: Clock, color: 'text-yellow-400' },
  failed: { icon: XCircle, color: 'text-red-400' },
  skipped: { icon: SkipForward, color: 'text-white-40' },
};

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
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

export default function NotificationSettingsPage() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const { data: logs } = useNotificationLogs(20);
  const { data: vapidKey } = useVapidKey();
  const pushSubscribe = usePushSubscribe();
  const pushUnsubscribe = usePushUnsubscribe();
  const { permission: pushPermission, isSubscribed: pushSubscribed, refresh: refreshPush } = usePushPermissionState();
  const testEmail = useTestEmail();
  const testSms = useTestSms();

  const [phone, setPhone] = useState('');
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  /** Strip non-digits, keep leading +, normalize to E.164 */
  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return '';
    // If 10 digits assume US, prepend +1
    if (digits.length === 10) return `+1${digits}`;
    // If 11 digits starting with 1, prepend +
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    // Otherwise prepend + if not already there
    return `+${digits}`;
  };

  /** Format for display: +1 (555) 123-4567 */
  const formatPhoneDisplay = (e164: string): string => {
    const digits = e164.replace(/[^\d]/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return e164;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading preferences...</span>
      </div>
    );
  }

  if (!prefs) return null;

  const eventPrefs = (prefs.preferencesJson ?? {}) as Record<string, boolean>;

  const toggleGlobal = (field: 'emailEnabled' | 'smsEnabled') => {
    update.mutate({ [field]: !prefs[field] });
  };

  const toggleEvent = (key: string) => {
    const current = eventPrefs[key] !== false; // default true
    update.mutate({ preferencesJson: { ...eventPrefs, [key]: !current } });
  };

  const togglePush = async () => {
    if (pushSubscribed && prefs?.pushEnabled) {
      // Unsubscribe
      await pushUnsubscribe.mutateAsync();
      refreshPush();
    } else if (vapidKey) {
      // Subscribe
      await pushSubscribe.mutateAsync(vapidKey);
      refreshPush();
    }
  };

  const togglePushEvent = (key: string) => {
    const current = eventPrefs[key] !== false; // default true
    update.mutate({ preferencesJson: { ...eventPrefs, [key]: !current } });
  };

  const savePhone = () => {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 10) return;
    update.mutate({ phoneNumber: normalized, smsEnabled: true });
    setPhoneEditing(false);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* In-app section */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-1">In-app</h2>
        <p className="text-xs text-white-40 mb-4">Notifications that appear in your Squadpitch bell icon and notifications page.</p>
        <div className="space-y-3">
          <button
            onClick={() => setExpanded((s) => ({ ...s, inapp: !s.inapp }))}
            className="card p-4 flex items-center gap-3 w-full text-left hover:bg-white-5 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center">
              <BellRing className="w-4.5 h-4.5 text-accent-green-110" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white-100">In-app notifications</p>
              <p className="text-xs text-white-40">Notifications in the bell icon and notifications page</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-white-40 transition-transform ${expanded.inapp ? 'rotate-180' : ''}`} />
          </button>
          {expanded.inapp && (
            <div className="space-y-1 ml-1">
              {INAPP_EVENT_TYPES.map((evt) => {
                const enabled = eventPrefs[evt.key] !== false;
                return (
                  <div
                    key={evt.key}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white-5 transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-medium text-white-100">{evt.label}</p>
                      <p className="text-xs text-white-40">{evt.desc}</p>
                    </div>
                    <Toggle
                      checked={enabled}
                      onChange={() => toggleEvent(evt.key)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Email section */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-1">Email</h2>
        <p className="text-xs text-white-40 mb-4">Email alerts for publishing events, usage limits, and connection issues.</p>
        <div className="space-y-3">
          <div className="card p-4 flex items-center justify-between">
            <button
              onClick={() => prefs.emailEnabled && setExpanded((s) => ({ ...s, email: !s.email }))}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4.5 h-4.5 text-accent-green-110" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white-100">
                  Email notifications
                </p>
                <p className="text-xs text-white-40">
                  Receive updates via email
                </p>
              </div>
              {prefs.emailEnabled && (
                <ChevronDown className={`w-4 h-4 text-white-40 transition-transform flex-shrink-0 ${expanded.email ? 'rotate-180' : ''}`} />
              )}
            </button>
            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
              {prefs.emailEnabled && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testEmail.mutate()}
                    disabled={testEmail.isPending}
                    className="text-xs text-white-40 hover:text-white-60 transition-colors disabled:opacity-50"
                  >
                    {testEmail.isPending ? 'Sending...' : 'Send test'}
                  </button>
                  {testEmail.isSuccess && (
                    <span className="text-xs text-green-400">Sent!</span>
                  )}
                  {testEmail.isError && (
                    <span className="text-xs text-red-400">Failed</span>
                  )}
                </div>
              )}
              <Toggle
                checked={prefs.emailEnabled}
                onChange={() => toggleGlobal('emailEnabled')}
              />
            </div>
          </div>

          {prefs.emailEnabled && expanded.email && (
            <div className="space-y-1 ml-1">
              {EVENT_TYPES.map((evt) => {
                const enabled = eventPrefs[evt.key] !== false;
                return (
                  <div
                    key={evt.key}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white-5 transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-medium text-white-100">
                        {evt.label}
                      </p>
                      <p className="text-xs text-white-40">{evt.desc}</p>
                    </div>
                    <Toggle
                      checked={enabled}
                      onChange={() => toggleEvent(evt.key)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SMS section */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-1">SMS</h2>
        <p className="text-xs text-white-40 mb-4">SMS is reserved for critical-only events like failed posts and expired connections.</p>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => prefs.smsEnabled && setExpanded((s) => ({ ...s, sms: !s.sms }))}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4.5 h-4.5 text-accent-green-110" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white-100">
                  SMS notifications
                </p>
                <p className="text-xs text-white-40">
                  Critical alerts only: post failed, connection expired
                </p>
              </div>
              {prefs.smsEnabled && (
                <ChevronDown className={`w-4 h-4 text-white-40 transition-transform flex-shrink-0 ${expanded.sms ? 'rotate-180' : ''}`} />
              )}
            </button>
            <div className="ml-3 flex-shrink-0">
              <Toggle
                checked={prefs.smsEnabled}
                onChange={() => toggleGlobal('smsEnabled')}
              />
            </div>
          </div>
          {prefs.smsEnabled && expanded.sms && (
            <div className="mt-3 ml-12">
              {phoneEditing || !prefs.phoneNumber ? (
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-123-4567"
                    className="input flex-1 text-sm"
                  />
                  <button
                    onClick={savePhone}
                    className="btn-primary text-sm px-4"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white-60">
                    {formatPhoneDisplay(prefs.phoneNumber || '')}
                  </span>
                  <button
                    onClick={() => {
                      setPhone(prefs.phoneNumber || '');
                      setPhoneEditing(true);
                    }}
                    className="text-xs text-accent-green-110 hover:underline"
                  >
                    Change
                  </button>
                  <button
                    onClick={() => testSms.mutate()}
                    disabled={testSms.isPending}
                    className="text-xs text-white-40 hover:text-white-60 transition-colors disabled:opacity-50"
                  >
                    {testSms.isPending ? 'Sending...' : 'Send test'}
                  </button>
                  {testSms.isSuccess && (
                    <span className="text-xs text-green-400">Sent!</span>
                  )}
                  {testSms.isError && (
                    <span className="text-xs text-red-400">
                      {(testSms.error as Error)?.message || 'Failed'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Browser Push section */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-1">Browser Push</h2>
        <p className="text-xs text-white-40 mb-4">Real-time browser notifications for time-sensitive events.</p>
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => prefs?.pushEnabled && pushSubscribed && setExpanded((s) => ({ ...s, push: !s.push }))}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4.5 h-4.5 text-accent-green-110" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white-100">
                    Browser push notifications
                  </p>
                  <p className="text-xs text-white-40">
                    {pushPermission === 'denied'
                      ? 'Blocked by browser'
                      : prefs?.pushEnabled && pushSubscribed
                        ? 'Enabled'
                        : 'Click to enable'}
                  </p>
                </div>
                {prefs?.pushEnabled && pushSubscribed && (
                  <ChevronDown className={`w-4 h-4 text-white-40 transition-transform flex-shrink-0 ${expanded.push ? 'rotate-180' : ''}`} />
                )}
              </button>
              <div className="ml-3 flex-shrink-0">
                <Toggle
                  checked={!!prefs?.pushEnabled && pushSubscribed}
                  onChange={togglePush}
                />
              </div>
            </div>
            {pushPermission === 'denied' && (
              <div className="mt-3 ml-12 flex items-center gap-2 text-xs text-yellow-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Push notifications are blocked. Please enable them in your browser settings.</span>
              </div>
            )}
          </div>

          {prefs?.pushEnabled && pushSubscribed && expanded.push && (
            <div className="space-y-1 ml-1">
              {PUSH_EVENT_TYPES.map((evt) => {
                const enabled = eventPrefs[evt.key] !== false;
                return (
                  <div
                    key={evt.key}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white-5 transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-medium text-white-100">
                        {evt.label}
                      </p>
                      <p className="text-xs text-white-40">{evt.desc}</p>
                    </div>
                    <Toggle
                      checked={enabled}
                      onChange={() => togglePushEvent(evt.key)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Weekly Digest section */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-1">Weekly Digest</h2>
        <p className="text-xs text-white-40 mb-4">A weekly summary of your workspace activity delivered every Monday.</p>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center">
                <CalendarDays className="w-4.5 h-4.5 text-accent-green-110" />
              </div>
              <div>
                <p className="text-sm font-medium text-white-100">
                  Weekly summary email
                </p>
                <p className="text-xs text-white-40">
                  Get a weekly recap of posts published, scheduled, and failed
                </p>
              </div>
            </div>
            <Toggle
              checked={prefs.digestEnabled}
              onChange={() => update.mutate({ digestEnabled: !prefs.digestEnabled })}
            />
          </div>
        </div>
      </section>

      {/* Recent notification log */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-4">
          Recent notifications
        </h2>
        {!logs || logs.length === 0 ? (
          <div className="card p-6 text-center space-y-1">
            <p className="text-sm text-white-40">No notifications sent yet.</p>
            <p className="text-xs text-white-30">Notifications will appear here once events like post publishing or connection expiry are triggered.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => {
              const config = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.queued;
              const Icon = config.icon;
              return (
                <div
                  key={log.id}
                  className="card p-3 flex items-center gap-3"
                >
                  <div className="flex-shrink-0">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white-100">
                        {EVENT_TYPES.find((e) => e.key === log.eventType)
                          ?.label ?? log.eventType}
                      </span>
                      <span className="text-xs text-white-30">
                        via {log.channel}
                        {log.provider ? ` (${log.provider})` : ''}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          log.status === 'sent'
                            ? 'bg-green-500/20 text-green-400'
                            : log.status === 'failed'
                              ? 'bg-red-500/20 text-red-400'
                              : log.status === 'queued'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-white-10 text-white-40'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    {log.errorMessage && (
                      <p className="text-xs text-red-400 mt-0.5">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-white-30 flex-shrink-0">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {update.isPending && (
        <div className="fixed bottom-6 right-6 bg-sp-card border border-white-10 rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg">
          <Loader2 className="w-4 h-4 animate-spin text-accent-green-110" />
          <span className="text-sm text-white-60">Saving...</span>
        </div>
      )}
    </div>
  );
}
