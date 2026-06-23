import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wrap any subtree that requires auth. Pass `allow` to additionally restrict
 * by role, e.g. <ProtectedRoute allow={['super_admin']} />.
 */
export default function ProtectedRoute({ allow }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        Loading session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allow && !allow.includes(user.role)) {
    // Authenticated but wrong role -> send to their own home, not login
    const home = user.role === 'super_admin' ? '/admin' : '/ac';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
