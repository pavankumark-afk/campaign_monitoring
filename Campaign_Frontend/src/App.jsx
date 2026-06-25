import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import Login from './pages/auth/Login';
import Profile from './pages/Profile';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import MaterialUploads from './pages/superadmin/MaterialUploads';
import MaterialDownloadStats from './pages/superadmin/MaterialDownloadStats';
import AcDashboard from './pages/ac/AcDashboard';
import AcMaterials from './pages/ac/AcMaterials';

function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'super_admin' ? '/admin' : '/ac'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Super Admin */}
          <Route element={<ProtectedRoute allow={['super_admin']} />}>
            <Route element={<AppShell />}>
              <Route path="/admin" element={<SuperAdminDashboard />} />
              <Route path="/admin/material/uploads" element={<MaterialUploads />} />
              <Route path="/admin/material/downloads" element={<MaterialDownloadStats />} />
              <Route path="/admin/profile" element={<Profile />} />
            </Route>
          </Route>

          {/* AC Level */}
          <Route element={<ProtectedRoute allow={['ac', 'mla']} />}>
            <Route element={<AppShell />}>
              <Route path="/ac" element={<AcDashboard />} />
              <Route path="/ac/material" element={<AcMaterials />} />
              <Route path="/ac/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
