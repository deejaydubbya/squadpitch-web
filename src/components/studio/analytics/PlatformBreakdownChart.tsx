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
import type { PlatformStat } from '@/hooks/useSquadpitch';

interface Props {
  data: PlatformStat[];
}

const CHANNEL_COLORS: Record<string, string> = {
  INSTAGRAM: '#E1306C',
  TIKTOK: '#00F2EA',
  X: '#FFFFFF',
  LINKEDIN: '#0A66C2',
  FACEBOOK: '#1877F2',
  YOUTUBE: '#FF0000',
};

export function PlatformBreakdownChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Platform Breakdown
        </h3>
        <p className="text-xs text-white-40 italic">Publish posts to see a breakdown by platform.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    channel: d.channel,
    posts: d.postCount,
    score: d.avgScore ?? 0,
    reach: d.totalReach ?? 0,
  }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-4">
        Platform Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" stroke="#ffffff40" tick={{ fill: '#ffffff60', fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="channel"
            stroke="#ffffff40"
            tick={{ fill: '#ffffff80', fontSize: 11, fontFamily: 'monospace' }}
            width={56}
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
          />
          <Bar dataKey="posts" name="Posts" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel] ?? '#1DBF60'} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
