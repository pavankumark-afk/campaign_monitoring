import { RefreshCw } from 'lucide-react';
import Card from '../../components/common/Card';
import StatTile from '../../components/common/StatTile';
import TallyStrip from '../../components/common/TallyStrip';
import TrendChart from '../../components/charts/TrendChart';
import { useAuth } from '../../context/AuthContext';
import { useSirSummary, useBoothBreakdown, useSirTrend } from '../../hooks/useSirData';
import { formatNumber, formatPercent, formatRelativeTime } from '../../utils/format';

export default function AcDashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading: summaryLoading, reload } = useSirSummary('ac', user?.acId);
  const { data: booths, isLoading: boothsLoading } = useBoothBreakdown(user?.acId);
  const { data: trend } = useSirTrend('ac', user?.acId, 14);

  const boothRows = (booths || [])
    .slice()
    .sort((a, b) => a.contacted / a.totalElectors - b.contacted / b.totalElectors)
    .map((b) => ({ label: b.boothName, done: b.contacted, total: b.totalElectors }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>SIR Dashboard</h1>
          <p>
            {user?.acName || 'Your constituency'} · synced from field data{' '}
            {summary?.lastSyncedAt ? formatRelativeTime(summary.lastSyncedAt) : ''}
          </p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={reload} disabled={summaryLoading}>
          <RefreshCw size={14} className={summaryLoading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="stat-grid page-section">
        <StatTile label="Total Electors" value={summaryLoading ? '—' : formatNumber(summary.totalElectors)} />
        <StatTile
          label="Contacted"
          value={summaryLoading ? '—' : formatNumber(summary.totalContacted)}
          delta={summaryLoading ? null : formatPercent(summary.totalContacted, summary.totalElectors) + ' of total'}
          deltaDirection="up"
        />
        <StatTile
          label="Pending"
          value={summaryLoading ? '—' : formatNumber(summary.totalPending)}
          delta={summaryLoading ? null : formatPercent(summary.totalPending, summary.totalElectors) + ' remaining'}
          deltaDirection="down"
        />
        <StatTile label="Booth Level Agents" value={summaryLoading ? '—' : formatNumber(summary.totalBoothAgents)} />
      </div>

      <div className="page-section">
        <Card title="Contact progress trend" subtitle="Last 14 days, this constituency">
          <TrendChart data={trend || []} />
        </Card>
      </div>

      <Card title="Booth-wise progress" subtitle="Sorted by lowest completion within your constituency">
        {boothsLoading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading booth breakdown…</p>
        ) : boothRows.length === 0 ? (
          <div className="empty-state">
            <h4>No booth data yet</h4>
            <p>Field data will appear here once booth agents start logging visits.</p>
          </div>
        ) : (
          <TallyStrip rows={boothRows} />
        )}
      </Card>
    </div>
  );
}
