import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import StatTile from '../../components/common/StatTile';
import { fetchUserActivityMetrics } from '../../api/analytics';
import { formatRelativeTime } from '../../utils/format';

const ACTIVE_ROLES = ['super_admin', 'ac', 'mla'];

function countActive(users) {
  return users.reduce((sum, u) => sum + (u.logged_in_today ? 1 : 0), 0);
}

export default function UserActivityMetrics() {
  const { user, isAC } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUserActivityMetrics({ role: user?.role });
      setMetrics(data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Unable to load activity metrics');
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const activeUserDetails = metrics?.active_user_details || [];
  const acOnlyDetails = useMemo(() => {
    if (!isAC || !user?.acName) return activeUserDetails;
    return activeUserDetails.filter((row) => String(row.ac_name || '').toLowerCase() === String(user.acName || '').toLowerCase());
  }, [activeUserDetails, isAC, user?.acName]);

  const filteredActiveUsers = useMemo(() => {
    if (!acOnlyDetails) return [];
    const searchValue = search.trim().toLowerCase();

    return acOnlyDetails
      .filter((user) => {
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        if (!matchesRole) return false;
        if (!searchValue) return true;
        return (
          String(user.full_name || '')
            .toLowerCase()
            .includes(searchValue) ||
          String(user.mobile || '')
            .toLowerCase()
            .includes(searchValue) ||
          String(user.pc_name || '')
            .toLowerCase()
            .includes(searchValue) ||
          String(user.ac_name || '')
            .toLowerCase()
            .includes(searchValue)
        );
      })
      .sort((a, b) => {
        const aTime = new Date(a.last_login_at || 0).getTime();
        const bTime = new Date(b.last_login_at || 0).getTime();
        return bTime - aTime;
      });
  }, [acOnlyDetails, roleFilter, search]);

  const acBreakdown = useMemo(() => {
    if (!metrics?.ac_level_logins) return [];
    const rows = [...metrics.ac_level_logins];
    if (isAC && user?.acName) {
      return rows.filter((row) => String(row.ac_name || '').toLowerCase() === String(user.acName || '').toLowerCase());
    }
    return rows.sort((a, b) => b.active_today - a.active_today);
  }, [metrics, isAC, user?.acName]);

  const pcBreakdown = useMemo(() => {
    if (!metrics?.pc_level_logins) return [];
    const rows = [...metrics.pc_level_logins];
    if (isAC) {
      const currentPcNames = Array.from(
        new Set(acOnlyDetails.map((row) => String(row.pc_name || '').trim()).filter(Boolean))
      );
      if (currentPcNames.length === 0) return [];
      return rows
        .filter((row) => currentPcNames.includes(String(row.pc_name || '').trim()))
        .sort((a, b) => b.active_today - a.active_today);
    }
    return rows.sort((a, b) => b.active_today - a.active_today);
  }, [metrics, isAC, acOnlyDetails]);

  const pageSubtitle = isAC
    ? `Showing activity metrics for ${user?.acName || 'your AC'} only.`
    : 'Login and activity details for all users, updated from the analytics API.';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>User Activity Metrics</h1>
          <p>{pageSubtitle}</p>
        </div>
      </div>

      {error && (
        <div className="page-section">
          <Card title="Unable to load activity metrics" subtitle="Please try again or verify permissions">
            <p style={{ color: 'var(--color-danger-700)', margin: 0 }}>{error}</p>
          </Card>
        </div>
      )}

      <div className="stat-grid page-section">
        <StatTile label="Total registered users" value={isLoading ? '—' : metrics?.total_registered_users ?? '—'} />
        <StatTile
          label="Active today"
          value={isLoading ? '—' : isAC ? acOnlyDetails.length : metrics?.total_active_today ?? '—'}
        />
        {!isAC && (
          <>
            <StatTile label="PC breakdown" value={isLoading ? '—' : pcBreakdown.length} />
            <StatTile label="AC breakdown" value={isLoading ? '—' : acBreakdown.length} />
          </>
        )}
      </div>

      <div className="page-section">
        <Card
          title="Active user details"
          subtitle="Search by name, mobile, PC, or AC"
          action={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ minWidth: 130 }}>
                <option value="all">All roles</option>
                {ACTIVE_ROLES.map((role) => (
                  <option key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
              <input
                placeholder="Search active users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: 220, padding: '8px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 6, fontSize: 13 }}
              />
            </div>
          }
        >
          {isLoading ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading analytics data…</p>
          ) : !metrics?.active_user_details || metrics.active_user_details.length === 0 ? (
            <div className="empty-state">
              <h4>No active users today</h4>
              <p>No logins or activity were recorded for the current day.</p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Role</th>
                    <th>PC</th>
                    <th>AC</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveUsers.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600 }}>{user.full_name || 'Unknown'}</td>
                      <td>{user.mobile || '—'}</td>
                      <td>{user.role}</td>
                      <td>{user.pc_name || 'Unassigned'}</td>
                      <td>{user.ac_name || 'Unassigned'}</td>
                      
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {!isAC && (
        <div className="page-section" style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <Card title="PC-level logins" subtitle="Active users grouped by parliamentary constituency">
            {isLoading ? (
              <p style={{ color: 'var(--color-text-muted)' }}>Loading PC breakdown…</p>
            ) : pcBreakdown.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No PC login data available.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PC</th>
                      <th className="data-table__numeric">Total users</th>
                      <th className="data-table__numeric">Active today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pcBreakdown.map((row) => (
                      <tr key={row.pc_name}>
                        <td>{row.pc_name}</td>
                        <td className="data-table__numeric">{row.total_users}</td>
                        <td className="data-table__numeric">{row.active_today}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="AC-level logins" subtitle="Active users grouped by assembly constituency">
            {isLoading ? (
              <p style={{ color: 'var(--color-text-muted)' }}>Loading AC breakdown…</p>
            ) : acBreakdown.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No AC login data available.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>AC</th>
                      <th className="data-table__numeric">Total users</th>
                      <th className="data-table__numeric">Active today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acBreakdown.map((row) => (
                      <tr key={row.ac_name}>
                        <td>{row.ac_name}</td>
                        <td className="data-table__numeric">{row.total_users}</td>
                        <td className="data-table__numeric">{row.active_today}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
