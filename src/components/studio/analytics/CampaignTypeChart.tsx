'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CampaignTypeStat } from '@/hooks/useSquadpitch';

const TYPE_LABELS: Record<string, string> = {
  just_listed: 'Just Listed',
  open_house: 'Open House',
  price_drop: 'Price Drop',
  just_sold: 'Just Sold',
  series: 'Content Series',
};

interface Props {
  data: CampaignTypeStat[];
}

export function CampaignTypeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Campaign Type Breakdown
        </h3>
        <p className="text-xs text-white-40 italic">No campaign type data available.</p>
      </div>
    );
  }

  const chartData = data
    .filter((d) => d.avgScore != null)
    .map((d) => ({
      campaignType: TYPE_LABELS[d.campaignType] || d.campaignType.charAt(0).toUpperCase() + d.campaignType.slice(1),
      score: d.avgScore ?? 0,
      campaigns: d.campaignCount,
      posts: d.totalPosts,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-4">
        Campaign Type Breakdown
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
            dataKey="campaignType"
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
            dataKey="score"
            name="Avg Score"
            fill="#F59E0B"
            fillOpacity={0.7}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
