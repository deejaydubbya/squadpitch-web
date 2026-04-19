'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ConversionByType } from '@/hooks/useSquadpitch';

interface Props {
  data: ConversionByType[];
}

const TYPE_LABELS: Record<string, string> = {
  LINK_CLICK: 'Link Clicks',
  FORM_SUBMISSION: 'Form Submissions',
  CALL_BOOKED: 'Calls Booked',
  CONTACT_CLICK: 'Contact Clicks',
  LISTING_INQUIRY: 'Listing Inquiries',
  CRM_LEAD: 'CRM Leads',
  CUSTOM: 'Custom',
};

export function ConversionsByTypeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Conversions by Type
        </h3>
        <p className="text-xs text-white-40 italic">No conversion data yet.</p>
      </div>
    );
  }

  const chartData = data
    .map((d) => ({
      type: TYPE_LABELS[d.type] || d.type,
      count: d.count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-4">
        Conversions by Type
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
            dataKey="count"
            name="Count"
            fill="#3B82F6"
            fillOpacity={0.7}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
