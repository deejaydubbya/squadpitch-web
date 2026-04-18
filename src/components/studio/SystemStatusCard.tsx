'use client';

import Link from 'next/link';
import { Plug, ChevronRight, AlertCircle } from 'lucide-react';
import { getChannelLabel } from '@/lib/channelRegistry';
import type { Channel, ChannelSettings, GroupedTechStack } from '@/hooks/useSquadpitch';

interface SystemStatusCardProps {
  enabledChannels: ChannelSettings[];
  connectionStatus: Map<Channel, boolean>;
  connectedCount: number;
  disconnectedCount: number;
  techStack: GroupedTechStack | null;
  base: string;
}

export function SystemStatusCard({
  enabledChannels,
  connectionStatus,
  connectedCount,
  disconnectedCount,
  techStack,
  base,
}: SystemStatusCardProps) {
  const hasChannels = enabledChannels.length > 0;
  const hasIntegrations =
    techStack && techStack.importData.length + techStack.enhanceWorkflow.length > 0;

  if (!hasChannels && !hasIntegrations) return null;

  const totalActive =
    connectedCount +
    (techStack
      ? [...techStack.importData, ...techStack.enhanceWorkflow].filter(
          (i) => i.connectionStatus === 'connected',
        ).length
      : 0);
  const totalItems =
    enabledChannels.length +
    (techStack ? techStack.importData.length + techStack.enhanceWorkflow.length : 0);

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

      {/* Integrations subsection */}
      {hasIntegrations && techStack && (
        <div>
          {(['importData', 'enhanceWorkflow'] as const).map((group) => {
            const items = techStack[group];
            if (items.length === 0) return null;
            const groupLabel = group === 'importData' ? 'Data Sources' : 'Workflow';
            return (
              <div key={group} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-white-25 uppercase tracking-wider">
                    {groupLabel}
                  </p>
                  {group === 'importData' && (
                    <Link
                      href={`${base}/settings/integrations`}
                      className="text-[11px] text-accent-green-110 hover:underline"
                    >
                      Manage
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <div
                      key={item.providerKey}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white-5 border border-white-10"
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          item.connectionStatus === 'connected'
                            ? 'bg-green-400'
                            : item.connectionStatus === 'error'
                              ? 'bg-red-400'
                              : item.status === 'planned'
                                ? 'bg-white-20'
                                : 'bg-yellow-400'
                        }`}
                      />
                      <span className="text-xs text-white-80 font-medium truncate">
                        {item.label}
                      </span>
                      <span
                        className={`text-[10px] flex-shrink-0 ${
                          item.connectionStatus === 'connected'
                            ? 'text-green-400'
                            : item.status === 'planned'
                              ? 'text-white-20'
                              : 'text-yellow-400'
                        }`}
                      >
                        {item.statusBadge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Combined warning CTA */}
      {(disconnectedCount > 0 ||
        (techStack && techStack.activeCount < techStack.totalCount)) && (
        <div className="mt-3 flex flex-col gap-1.5">
          {disconnectedCount > 0 && (
            <Link
              href={`${base}/settings/channels`}
              className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Connect your accounts to schedule and publish content
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {techStack &&
            techStack.activeCount < techStack.totalCount &&
            disconnectedCount === 0 && (
              <Link
                href={`${base}/settings/integrations`}
                className="flex items-center gap-1.5 text-xs text-accent-green-110 hover:underline transition-colors"
              >
                Connect more integrations to enhance your workflow
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
        </div>
      )}
    </div>
  );
}
