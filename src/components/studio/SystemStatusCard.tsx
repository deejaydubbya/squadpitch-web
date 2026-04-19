'use client';

import Link from 'next/link';
import { Plug, ChevronRight, AlertCircle } from 'lucide-react';
import { getChannelLabel } from '@/lib/channelRegistry';
import type { Channel, ChannelSettings } from '@/hooks/useSquadpitch';

interface SystemStatusCardProps {
  enabledChannels: ChannelSettings[];
  connectionStatus: Map<Channel, boolean>;
  connectedCount: number;
  disconnectedCount: number;
  integrationStatus?: { gbp?: { status: string }; crm?: { status: string } } | null;
  isRE: boolean;
  listingSourceCount: number;
  cloudStorageConnected: boolean;
  base: string;
}

export function SystemStatusCard({
  enabledChannels,
  connectionStatus,
  connectedCount,
  disconnectedCount,
  integrationStatus,
  isRE,
  listingSourceCount,
  cloudStorageConnected,
  base,
}: SystemStatusCardProps) {
  const hasChannels = enabledChannels.length > 0;

  const gbpConnected = integrationStatus?.gbp?.status === 'connected';
  const crmConnected = integrationStatus?.crm?.status === 'connected';
  const listingsConnected = listingSourceCount > 0;

  // Build integration items — same sources shown on Sources/Connections and Settings/Integrations
  const integrations: { key: string; label: string; connected: boolean; href: string }[] = [
    { key: 'gbp', label: 'Google Business Profile', connected: gbpConnected, href: `${base}/settings/integrations` },
  ];
  if (isRE) {
    integrations.push({ key: 'crm', label: 'CRM', connected: crmConnected, href: `${base}/settings/integrations` });
    integrations.push({ key: 'listings', label: 'Listing Feeds', connected: listingsConnected, href: `${base}/sources?tab=connections` });
  }
  integrations.push({ key: 'cloud', label: 'Cloud Storage', connected: cloudStorageConnected, href: `${base}/settings/integrations` });

  const hasIntegrations = integrations.length > 0;

  if (!hasChannels && !hasIntegrations) return null;

  const activeIntegrations = integrations.filter((i) => i.connected).length;
  const totalActive = connectedCount + activeIntegrations;
  const totalItems = enabledChannels.length + integrations.length;

  return (
    <div className="card p-5 border-white-10">
      {/* Combined header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-accent-green-110" />
          <h2 className="text-sm font-semibold text-white-100">System Status</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-green-110/10 text-accent-green-110">
            {totalActive}/{totalItems} active
          </span>
        </div>
      </div>

      {/* Channels subsection */}
      {hasChannels && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] text-white-25 uppercase tracking-wider">Channels</p>
            <Link
              href={`${base}/settings/channels`}
              className="text-[11px] text-accent-green-110 hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {enabledChannels.map((ch) => {
              const connected = connectionStatus.get(ch.channel) === true;
              return (
                <div
                  key={ch.channel}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      connected ? 'bg-green-400' : 'bg-yellow-400'
                    }`}
                  />
                  <span className="text-xs text-white-80 font-medium">
                    {getChannelLabel(ch.channel)}
                  </span>
                  <span
                    className={`text-[10px] ${connected ? 'text-green-400' : 'text-yellow-400'}`}
                  >
                    {connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      {hasChannels && hasIntegrations && (
        <div className="border-t border-white-10 my-3" />
      )}

      {/* Data Sources subsection */}
      {hasIntegrations && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] text-white-25 uppercase tracking-wider">Data Sources</p>
            <Link
              href={`${base}/settings/integrations`}
              className="text-[11px] text-accent-green-110 hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {integrations.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 hover:border-white-20 hover:bg-white-10 transition-all"
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.connected ? 'bg-green-400' : 'bg-yellow-400'
                  }`}
                />
                <span className="text-xs text-white-80 font-medium">{item.label}</span>
                <span className={`text-[10px] ${item.connected ? 'text-green-400' : 'text-yellow-400'}`}>
                  {item.connected ? 'Connected' : 'Not connected'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Combined warning CTA */}
      {disconnectedCount > 0 && (
        <div className="mt-3">
          <Link
            href={`${base}/settings/channels`}
            className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Connect your accounts to schedule and publish content
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
