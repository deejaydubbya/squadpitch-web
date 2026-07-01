'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { PlatformStat, Channel } from '@/hooks/useSquadpitch';
import { getChannelLabel } from '@/lib/channelRegistry';

type MetricKey = 'postCount' | 'totalReach' | 'avgEngagementRate';

interface Props {
  data: PlatformStat[];
  metric?: MetricKey;
  title?: string;
}

const CHANNEL_COLORS: Record<string, string> = {
  INSTAGRAM: '#E1306C',
  TIKTOK: '#00F2EA',
  X: '#FFFFFF',
  LINKEDIN: '#0A66C2',
  FACEBOOK: '#1877F2',
  YOUTUBE: '#FF0000',
};

const METRIC_CONFIG: Record<MetricKey, { dataKey: string; name: string }> = {
  postCount: { dataKey: 'posts', name: 'Posts' },
  totalReach: { dataKey: 'reach', name: 'Reach' },
  avgEngagementRate: { dataKey: 'rate', name: 'Avg ER' },
};

function formatTooltipValue(value: number, metric: MetricKey): string {
  if (metric === 'avgEngagementRate') return `${(value * 100).toFixed(2)}%`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function PlatformBreakdownChart({
  data,
  metric = 'postCount',
  title = 'Platform Breakdown',
}: Props) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          {title}
        </h3>
        <p className="text-xs text-white-40 italic">Publish posts to see a breakdown by platform.</p>
      </div>
    );
  }

  const { dataKey, name } = METRIC_CONFIG[metric];

  const chartData = data.map((d) => ({
    channel: d.channel,
    posts: d.postCount,
    score: d.avgScore ?? 0,
    reach: d.totalReach ?? 0,
    rate: d.avgEngagementRate ?? 0,
  }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" stroke="#ffffff40" tick={{ fill: '#ffffff60', fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="channel"
            stroke="#ffffff40"
            tick={{ fill: '#ffffff80', fontSize: 11 }}
            tickFormatter={(value: string) => getChannelLabel(value as Channel)}
            width={72}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0B1413',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: 11,
            }}
            labelStyle={{ color: '#fff' }}
            itemStyle={{ color: '#ffffff99' }}
            formatter={(value: number) => formatTooltipValue(value, metric)}
          />
          <Bar dataKey={dataKey} name={name} radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel] ?? '#1DBF60'} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
