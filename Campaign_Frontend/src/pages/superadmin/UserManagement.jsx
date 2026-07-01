import { useCallback, useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import { fetchMlaMonitorUsers, updateMlaStatus } from '../../api/acs';
import { formatRelativeTime } from '../../utils/format';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchMlaMonitorUsers();
      setUsers(rows);
    } catch (err) {
      setError(err?.message || 'Unable to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'idle' ? 'active' : 'idle';
    setUpdatingId(user.id);
    try {
      await updateMlaStatus(user.id, newStatus);
      await loadUsers();
    } catch (err) {
      setError(err?.message || 'Unable to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Activate or idle user accounts for AC/MLA coordinators.</p>
        </div>
      </div>

      {error && (
        <div className="page-section">
          <Card title="Unable to load users" subtitle="Try refreshing or check your permissions">
            <p style={{ color: 'var(--color-danger-700)', margin: 0 }}>{error}</p>
          </Card>
        </div>
      )}

      <div className="page-section">
        <Card title="AC & MLA accounts" subtitle="Toggle account availability for super admins">
          {isLoading ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading users…</p>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <h4>No user accounts found</h4>
              <p>There are no AC or MLA users available for management.</p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last login</th>
                    <th>Downloads</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name || `User ${user.id}`}</td>
                      <td>{user.mobile || '-'}</td>
                      <td>{user.role}</td>
                      <td style={{ textTransform: 'capitalize' }}>{user.status || 'active'}</td>
                      <td>{user.last_login ? formatRelativeTime(user.last_login) : 'Never'}</td>
                      <td className="data-table__numeric">{user.total_downloads ?? 0}</td>
                      <td>
                        <button
                          className={`btn btn--${user.status === 'idle' ? 'primary' : 'danger'}`}
                          onClick={() => handleToggleStatus(user)}
                          disabled={updatingId === user.id}
                        >
                          {user.status === 'idle' ? 'Activate' : 'Make idle'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
