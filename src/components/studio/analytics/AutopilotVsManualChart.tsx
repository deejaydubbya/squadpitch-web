'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Props {
  avgAutopilotScore: number | null;
  avgManualScore: number | null;
  avgAutopilotEngagement: number | null;
  avgManualEngagement: number | null;
}

export function AutopilotVsManualChart({
  avgAutopilotScore,
  avgManualScore,
  avgAutopilotEngagement,
  avgManualEngagement,
}: Props) {
  const hasScores = avgAutopilotScore != null || avgManualScore != null;
  const hasEngagement = avgAutopilotEngagement != null || avgManualEngagement != null;

  if (!hasScores && !hasEngagement) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Autopilot vs Manual
        </h3>
        <p className="text-xs text-white-40 italic">
          Not enough published data for comparison.
        </p>
      </div>
    );
  }

  const chartData = [];
  if (hasScores) {
    chartData.push({
      metric: 'Avg Score',
      Autopilot: avgAutopilotScore ?? 0,
      Manual: avgManualScore ?? 0,
    });
  }
  if (hasEngagement) {
    chartData.push({
      metric: 'Eng. Rate %',
      Autopilot: avgAutopilotEngagement != null ? Math.round(avgAutopilotEngagement * 10000) / 100 : 0,
      Manual: avgManualEngagement != null ? Math.round(avgManualEngagement * 10000) / 100 : 0,
    });
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-4">
        Autopilot vs Manual
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <XAxis
            dataKey="metric"
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
          <Legend
            wrapperStyle={{ fontSize: 10, color: '#ffffff80' }}
          />
          <Bar
            dataKey="Autopilot"
            fill="#8B5CF6"
            fillOpacity={0.7}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="Manual"
            fill="#1DBF60"
            fillOpacity={0.7}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
