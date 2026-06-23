import { User, Shield, MapPin } from 'lucide-react';
import Card from '../components/common/Card';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, isSuperAdmin } = useAuth();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Your account details.</p>
        </div>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--color-ink)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={26} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{user?.name}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              {isSuperAdmin ? 'Super Admin' : 'AC Level Coordinator'}
            </div>
          </div>
        </div>

        <div className="profile-detail">
          <Shield size={15} />
          <span>Role</span>
          <strong>{isSuperAdmin ? 'Super Admin' : 'AC Level'}</strong>
        </div>
        {!isSuperAdmin && (
          <div className="profile-detail">
            <MapPin size={15} />
            <span>Constituency</span>
            <strong>{user?.acName || '—'}</strong>
          </div>
        )}
      </Card>
    </div>
  );
}
