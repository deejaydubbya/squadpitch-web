'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AutopilotTriggerStat } from '@/hooks/useSquadpitch';

const TRIGGER_LABELS: Record<string, string> = {
  new_listing: 'New Listing',
  inactivity_gap: 'Inactivity Gap',
  new_review: 'New Review',
  new_milestone: 'New Milestone',
  unknown: 'Other',
};

interface Props {
  data: AutopilotTriggerStat[];
}

export function AutopilotTriggerChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          By Trigger
        </h3>
        <p className="text-xs text-white-40 italic">No trigger data available.</p>
      </div>
    );
  }

  const chartData = data
    .map((d) => ({
      trigger: TRIGGER_LABELS[d.trigger] || d.trigger.charAt(0).toUpperCase() + d.trigger.slice(1),
      count: d.count,
      published: d.publishedCount,
      score: d.avgScore ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-4">
        By Trigger
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 100, right: 16, top: 4, bottom: 4 }}
        >
          <XAxis
            type="number"
            stroke="#ffffff40"
            tick={{ fill: '#ffffff60', fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="trigger"
            stroke="#ffffff40"
            tick={{ fill: '#ffffff80', fontSize: 11, fontFamily: 'monospace' }}
            width={92}
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
          <Bar
            dataKey="count"
            name="Drafts Generated"
            fill="#8B5CF6"
            fillOpacity={0.7}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
