import { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import Card from '../../components/common/Card';
import StatTile from '../../components/common/StatTile';
import TallyStrip from '../../components/common/TallyStrip';
import { useSirSummary, useAcBreakdown, useSirTrend } from '../../hooks/useSirData';
import { formatNumber, formatPercent, formatRelativeTime } from '../../utils/format';
import TrendChart from '../../components/charts/TrendChart';

export default function SuperAdminDashboard() {
  const { data: summary, isLoading: summaryLoading, error: summaryError, reload } = useSirSummary('super_admin');
  const { data: breakdown, isLoading: breakdownLoading, error: breakdownError } = useAcBreakdown();
  const { data: trend, error: trendError } = useSirTrend('super_admin', null, 14);
  const [search, setSearch] = useState('');
  const dashboardError = summaryError || breakdownError || trendError;

  const filtered = useMemo(() => {
    if (!breakdown) return [];
    const sorted = [...breakdown].sort((a, b) => {
      const pa = a.contacted / a.totalElectors;
      const pb = b.contacted / b.totalElectors;
      return pb - pa; // highest progress first
    });
    if (!search.trim()) return sorted;
    const q = search.trim().toLowerCase();
    return sorted.filter((r) => r.acName.toLowerCase().includes(q) || r.acId.toLowerCase().includes(q));
  }, [breakdown, search]);

  const topRows = filtered.slice(0, 12).map((r) => ({ label: r.acName, done: r.contacted, total: r.totalElectors }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>SIR Dashboard</h1>
          <p>
            Aggregated statistics across all 175 ACs · synced from field data{' '}
            {summary?.lastSyncedAt ? formatRelativeTime(summary.lastSyncedAt) : ''}
          </p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={reload} disabled={summaryLoading}>
          <RefreshCw size={14} className={summaryLoading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {dashboardError && (
        <div className="page-section">
          <Card title="Live metrics unavailable" subtitle="Could not fetch hierarchical metrics from backend">
            <p style={{ color: 'var(--color-danger-700)', margin: 0 }}>
              {dashboardError?.response?.status
                ? `Request failed with status ${dashboardError.response.status}.`
                : dashboardError?.message || 'Unknown API error'}
            </p>
          </Card>
        </div>
      )}

      <div className="stat-grid page-section">
        <StatTile label="Total Electors" value={summaryLoading ? '—' : formatNumber(summary?.totalElectors)} />
        <StatTile
          label="Contacted"
          value={summaryLoading ? '—' : formatNumber(summary?.totalContacted)}
          delta={summaryLoading ? null : formatPercent(summary?.totalContacted, summary?.totalElectors) + ' of total'}
          deltaDirection="up"
        />
        <StatTile
          label="Pending"
          value={summaryLoading ? '—' : formatNumber(summary?.totalPending)}
          delta={summaryLoading ? null : formatPercent(summary?.totalPending, summary?.totalElectors) + ' remaining'}
          deltaDirection="down"
        />
        <StatTile label="Booth Level Agents" value={summaryLoading ? '—' : formatNumber(summary?.totalBLAs)} />
      </div>

      <div className="page-section">
        <Card title="Contact progress trend" subtitle="Last 14 days, all ACs combined">
          <TrendChart data={trend || []} />
        </Card>
      </div>

      <Card
        title="AC-wise progress"
        subtitle="Sorted by highest completion — top-performing constituencies first"
        action={
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--color-text-muted)' }} />
            <input
              placeholder="Search AC…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, padding: '8px 12px 8px 32px', border: '1px solid var(--color-border-strong)', borderRadius: 6, fontSize: 13, width: 200 }}
            />
          </div>
        }
      >
        {breakdownLoading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading AC breakdown…</p>
        ) : topRows.length === 0 ? (
          <div className="empty-state">
            <h4>No matching ACs</h4>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <>
            <TallyStrip rows={topRows} />
            {filtered.length > 12 && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-muted)' }}>
                Showing 12 of {filtered.length} ACs needing the most attention. Use search to find a specific one.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
