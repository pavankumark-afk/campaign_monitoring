import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber, formatDate } from '../../utils/format';

export default function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No trend data yet.</p>;
  }
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#DDD8CC" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatDate(d).replace(/\s\d{4}$/, '')}
            tick={{ fontSize: 11, fill: '#6B7178' }}
            axisLine={{ stroke: '#DDD8CC' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatNumber(v)}
            tick={{ fontSize: 11, fill: '#6B7178' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            formatter={(v) => [formatNumber(v), 'Contacted']}
            labelFormatter={(d) => formatDate(d)}
            contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #DDD8CC' }}
          />
          <Bar dataKey="contacted" fill="#0B3D2E" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
