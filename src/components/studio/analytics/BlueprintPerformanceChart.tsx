'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BusinessDataBlueprintStat } from '@/hooks/useSquadpitch';

interface Props {
  data: BusinessDataBlueprintStat[];
}

export function BlueprintPerformanceChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Blueprint Performance
        </h3>
        <p className="text-xs text-white-40 italic">No blueprint performance data yet.</p>
      </div>
    );
  }

  const chartData = data
    .filter((d) => d.avgScore != null)
    .map((d) => ({
      name: d.blueprintName.length > 20 ? d.blueprintName.slice(0, 18) + '…' : d.blueprintName,
      score: d.avgScore ?? 0,
      drafts: d.totalDrafts,
      published: d.totalPublished,
    }))
    .sort((a, b) => b.score - a.score);

  if (chartData.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-4">
        Blueprint Performance
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 32)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 120, right: 16, top: 4, bottom: 4 }}
        >
          <XAxis
            type="number"
            stroke="#ffffff40"
            tick={{ fill: '#ffffff60', fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#ffffff40"
            tick={{ fill: '#ffffff80', fontSize: 10, fontFamily: 'monospace' }}
            width={112}
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
            fill="#06B6D4"
            fillOpacity={0.7}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
