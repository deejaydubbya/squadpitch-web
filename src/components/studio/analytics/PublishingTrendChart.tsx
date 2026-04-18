'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrendPoint } from '@/hooks/useSquadpitch';

interface Props {
  data: TrendPoint[];
}

export function PublishingTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Publishing Trend
        </h3>
        <p className="text-xs text-white-40 italic">Publish posts to see your publishing trend.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    count: d.count,
    score: d.avgScore ?? 0,
  }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-4">
        Publishing Trend
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="publishGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1DBF60" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#1DBF60" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            stroke="#ffffff40"
            tick={{ fill: '#ffffff60', fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            stroke="#ffffff40"
            tick={{ fill: '#ffffff60', fontSize: 10 }}
            allowDecimals={false}
            width={28}
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
          <Area
            type="monotone"
            dataKey="count"
            name="Posts"
            stroke="#1DBF60"
            strokeWidth={2}
            fill="url(#publishGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
