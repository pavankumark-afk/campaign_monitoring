import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import Card from '../../components/common/Card';
import StatTile from '../../components/common/StatTile';
import TallyStrip from '../../components/common/TallyStrip';
import { useSirSummary, useAcBreakdown, usePcBreakdown, useSirTrend } from '../../hooks/useSirData';
import { formatNumber, formatPercent, formatRelativeTime } from '../../utils/format';
import TrendChart from '../../components/charts/TrendChart';

export default function SuperAdminDashboard() {
  const { data: summary, isLoading: summaryLoading, error: summaryError, reload } = useSirSummary('super_admin');
  const { data: breakdown, isLoading: breakdownLoading, error: breakdownError } = useAcBreakdown();
  const { data: pcBreakdown, isLoading: pcLoading, error: pcError } = usePcBreakdown();
  const { data: trend, error: trendError } = useSirTrend('super_admin', null, 14);
  const [search, setSearch] = useState('');
  const dashboardError = summaryError || breakdownError || pcError || trendError;

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
  const pcRows = (pcBreakdown || [])
    .slice()
    .sort((a, b) => b.contacted / b.totalElectors - a.contacted / a.totalElectors)
    .map((pc) => ({
      id: pc.pcId,
      label: pc.pcName,
      done: pc.contacted,
      total: pc.totalElectors,
      pct: pc.totalElectors > 0 ? (pc.contacted / pc.totalElectors) * 100 : 0,
    }));

  const pcCards = pcRows.slice(0, 25);

  const [pcModal, setPcModal] = useState(null); // { id, name, acs }

  const acListByPc = (breakdown || []).reduce((acc, ac) => {
    const pcId = ac.pcId || (ac.acName && (ac.acName.match(/PC\s*(\d+)/i) || [])[1]) || '';
    if (!acc[pcId]) acc[pcId] = [];
    acc[pcId].push(ac);
    return acc;
  }, {});

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
              style={{ paddingLeft: 32, padding: '8px 12px 8px 32px', border: '1px solid var(--color-border-strong)', borderRadius: 6, fontSize: 13, width: 200, maxWidth: '100%' }}
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

      <Card title="PC-wise progress" subtitle="Top 25 parliamentary constituencies by completion">
        {pcLoading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading PC breakdown…</p>
        ) : pcRows.length === 0 ? (
          <div className="empty-state">
            <h4>No PC data yet</h4>
            <p>PC metrics will appear here once the hierarchical response includes them.</p>
          </div>
        ) : (
          <>
            <div className="pc-card-grid">
              {pcCards.map((pc) => (
                <div
                  className="pc-card"
                  key={pc.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPcModal({ id: pc.id, name: pc.label, acs: acListByPc[pc.id] || [] })}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setPcModal({ id: pc.id, name: pc.label, acs: acListByPc[pc.id] || [] })}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="pc-card__header">
                    <span>{pc.label}</span>
                    <strong>{Math.round(pc.pct)}%</strong>
                  </div>
                  <div className="pc-card__body">
                    <span>{pc.done.toLocaleString()} contacted</span>
                    <span>{pc.total.toLocaleString()} electors</span>
                  </div>
                </div>
              ))}
            </div>
            {pcRows.length > 25 && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-muted)' }}>
                Showing 25 of {pcRows.length} PCs.
              </p>
            )}
          </>
        )}
      </Card>
      {pcModal && <PcModal payload={pcModal} onClose={() => setPcModal(null)} />}
    </div>
  );
}

function PcModal({ payload, onClose }) {
  const { id, name, acs } = payload;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{name}</h3>
          <button className="btn btn--ghost btn--icon btn--sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal__body">
          <p className="field-hint" style={{ marginBottom: 14 }}>
            {acs.length} AC{acs.length !== 1 ? 's' : ''} in this parliamentary constituency.
          </p>

          <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>AC</th><th className="data-table__numeric">Contacted</th><th className="data-table__numeric">Electors</th></tr>
                </thead>
                <tbody>
                  {(acs || [])
                    .slice()
                    .sort((a, b) => b.contacted / b.totalElectors - a.contacted / a.totalElectors)
                    .map((ac) => (
                      <tr key={ac.acId}>
                        <td style={{ fontWeight: 600 }}>{ac.acName}</td>
                        <td className="data-table__numeric">{ac.contacted.toLocaleString()}</td>
                        <td className="data-table__numeric">{ac.totalElectors.toLocaleString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
