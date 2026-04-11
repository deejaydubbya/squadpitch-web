'use client';

import { useState } from 'react';
import { Mail, Smartphone, Bell, Loader2, CheckCircle } from 'lucide-react';
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
  },
  {
    key: 'POST_FAILED',
    label: 'Post failed',
    desc: 'When a post fails to publish (connection issue, API error, etc.).',
  },
  {
    key: 'POST_NEEDS_APPROVAL',
    label: 'Posts need approval',
    desc: 'When you have pending posts waiting for review.',
  },
  {
    key: 'USAGE_LIMIT_NEARING',
    label: 'Usage limit nearing',
    desc: 'When you reach 80% of your monthly plan limit.',
  },
  {
    key: 'CONNECTION_EXPIRED',
    label: 'Connection expired',
    desc: 'When a channel connection token expires.',
  },
  {
    key: 'BATCH_COMPLETE',
    label: 'Batch complete',
    desc: 'When a batch content generation finishes.',
  },
  {
    key: 'WEEKLY_SUMMARY',
    label: 'Weekly summary',
    desc: 'A weekly recap of your content performance.',
  },
];

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

  const eventPrefs = (prefs.preferences ?? {}) as Record<string, boolean>;

  const toggleGlobal = (field: 'emailEnabled' | 'smsEnabled') => {
    update.mutate({ [field]: !prefs[field] });
  };

  const toggleEvent = (key: string) => {
    const current = eventPrefs[key] !== false; // default true
    update.mutate({ preferences: { ...eventPrefs, [key]: !current } });
  };

  const savePhone = () => {
    update.mutate({ phone: phone || null, smsEnabled: true });
    setPhoneEditing(false);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Global toggles */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-4">Notification channels</h2>
        <div className="space-y-3">
          <div className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center">
                <Mail className="w-4.5 h-4.5 text-accent-green-110" />
              </div>
              <div>
                <p className="text-sm font-medium text-white-100">Email notifications</p>
                <p className="text-xs text-white-40">Receive updates via email</p>
              </div>
            </div>
            <button
              onClick={() => toggleGlobal('emailEnabled')}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                prefs.emailEnabled ? 'bg-accent-green-110' : 'bg-white-10'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  prefs.emailEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-green-110/20 flex items-center justify-center">
                  <Smartphone className="w-4.5 h-4.5 text-accent-green-110" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white-100">SMS notifications</p>
                  <p className="text-xs text-white-40">Critical alerts only (post failed, connection expired)</p>
                </div>
              </div>
              <button
                onClick={() => toggleGlobal('smsEnabled')}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  prefs.smsEnabled ? 'bg-accent-green-110' : 'bg-white-10'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    prefs.smsEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {prefs.smsEnabled && (
              <div className="mt-3 ml-12">
                {phoneEditing || !prefs.phone ? (
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555-123-4567"
                      className="input flex-1 text-sm"
                    />
                    <button onClick={savePhone} className="btn-primary text-sm px-4">
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white-60">{prefs.phone}</span>
                    <button
                      onClick={() => {
                        setPhone(prefs.phone || '');
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
        </div>
      </section>

      {/* Per-event toggles */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-4">Event preferences</h2>
        <div className="space-y-1">
          {EVENT_TYPES.map((evt) => {
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
                <button
                  onClick={() => toggleEvent(evt.key)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    enabled ? 'bg-accent-green-110' : 'bg-white-10'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent notification log */}
      <section>
        <h2 className="text-base font-semibold text-white-100 mb-4">Recent notifications</h2>
        {(!logs || logs.length === 0) ? (
          <div className="card p-6 text-center text-sm text-white-40">
            No notifications sent yet.
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="card p-3 flex items-center gap-3">
                <div className="flex-shrink-0">
                  {log.status === 'SENT' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Bell className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white-100">
                      {EVENT_TYPES.find((e) => e.key === log.eventType)?.label ?? log.eventType}
                    </span>
                    <span className="text-xs text-white-30">via {log.channel}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      log.status === 'SENT'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  {log.error && (
                    <p className="text-xs text-red-400 mt-0.5">{log.error}</p>
                  )}
                </div>
                <span className="text-xs text-white-30 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
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
