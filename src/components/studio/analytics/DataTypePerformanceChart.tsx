'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BusinessDataTypeStat } from '@/hooks/useSquadpitch';

const TYPE_LABELS: Record<string, string> = {
  TESTIMONIAL: 'Testimonial',
  CASE_STUDY: 'Case Study',
  PRODUCT_LAUNCH: 'Product Launch',
  PROMOTION: 'Promotion',
  STATISTIC: 'Statistic',
  MILESTONE: 'Milestone',
  FAQ: 'FAQ',
  TEAM_SPOTLIGHT: 'Team Spotlight',
  INDUSTRY_NEWS: 'Industry News',
  EVENT: 'Event',
  PROPERTY: 'Property',
  CUSTOM: 'Custom',
};

interface Props {
  data: BusinessDataTypeStat[];
}

export function DataTypePerformanceChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Performance by Data Type
        </h3>
        <p className="text-xs text-white-40 italic">No data type performance available.</p>
      </div>
    );
  }

  const chartData = data
    .filter((d) => d.avgScore != null)
    .map((d) => ({
      type: TYPE_LABELS[d.type] || d.type,
      score: d.avgScore ?? 0,
      items: d.itemCount,
      published: d.totalPublished,
    }))
    .sort((a, b) => b.score - a.score);

  if (chartData.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-4">
        Performance by Data Type
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 32)}>
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
            dataKey="type"
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
            fill="#06B6D4"
            fillOpacity={0.7}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
