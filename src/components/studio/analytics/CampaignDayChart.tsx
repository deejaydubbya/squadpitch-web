'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CampaignDayStat } from '@/hooks/useSquadpitch';

interface Props {
  data: CampaignDayStat[];
}

export function CampaignDayChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Performance by Campaign Day
        </h3>
        <p className="text-xs text-white-40 italic">No campaign day data available.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    day: `Day ${d.day}`,
    score: d.avgScore ?? 0,
    posts: d.postCount,
  }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-4">
        Performance by Campaign Day
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
        >
          <XAxis
            dataKey="day"
            stroke="#ffffff40"
            tick={{ fill: '#ffffff80', fontSize: 11, fontFamily: 'monospace' }}
          />
          <YAxis
            stroke="#ffffff40"
            tick={{ fill: '#ffffff60', fontSize: 10 }}
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
            dataKey="score"
            name="Avg Score"
            fill="#F59E0B"
            fillOpacity={0.7}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
