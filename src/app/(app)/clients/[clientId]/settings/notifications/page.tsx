'use client';

import { useState } from 'react';
import { Mail, Smartphone, Loader2, CheckCircle, Clock, XCircle, SkipForward } from 'lucide-react';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useNotificationLogs,
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

  const [phone, setPhone] = useState('');
  const [phoneEditing, setPhoneEditing] = useState(false);

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

  const savePhone = () => {
    update.mutate({ phoneNumber: phone || null, smsEnabled: true });
    setPhoneEditing(false);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Email section */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-4">Email</h2>
        <div className="space-y-3">
          <div className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center">
                <Mail className="w-4.5 h-4.5 text-accent-green-110" />
              </div>
              <div>
                <p className="text-sm font-medium text-white-100">
                  Email notifications
                </p>
                <p className="text-xs text-white-40">
                  Receive updates via email
                </p>
              </div>
            </div>
            <Toggle
              checked={prefs.emailEnabled}
              onChange={() => toggleGlobal('emailEnabled')}
            />
          </div>

          {prefs.emailEnabled && (
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
        <h2 className="text-base font-semibold text-white-100 mb-4">SMS</h2>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center">
                <Smartphone className="w-4.5 h-4.5 text-accent-green-110" />
              </div>
              <div>
                <p className="text-sm font-medium text-white-100">
                  SMS notifications
                </p>
                <p className="text-xs text-white-40">
                  Critical alerts only: post failed, connection expired
                </p>
              </div>
            </div>
            <Toggle
              checked={prefs.smsEnabled}
              onChange={() => toggleGlobal('smsEnabled')}
            />
          </div>
          {prefs.smsEnabled && (
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
                    {prefs.phoneNumber}
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
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Recent notification log */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-4">
          Recent notifications
        </h2>
        {!logs || logs.length === 0 ? (
          <div className="card p-6 text-center text-sm text-white-40">
            No notifications sent yet.
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
