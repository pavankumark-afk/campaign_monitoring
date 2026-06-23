import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber, formatDate } from '../../utils/format';

export default function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No trend data yet.</p>;
  }
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="contactedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B3D2E" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#0B3D2E" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
          <Area type="monotone" dataKey="contacted" stroke="#0B3D2E" strokeWidth={2} fill="url(#contactedFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
