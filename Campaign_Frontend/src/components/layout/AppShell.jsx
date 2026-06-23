import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SUPER_ADMIN_NAV, AC_NAV } from '../../utils/navConfig';
import './AppShell.css';

export default function AppShell() {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navItems = isSuperAdmin ? SUPER_ADMIN_NAV : AC_NAV;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const contextLabel = isSuperAdmin ? 'Super Admin' : user?.acName || 'AC Level';

  return (
    <div className="shell">
      <aside className={`shell__sidebar ${mobileNavOpen ? 'shell__sidebar--open' : ''}`}>
        <div className="shell__brand">
          <span className="shell__brand-mark">SIR</span>
          <span className="shell__brand-text">Monitoring</span>
        </div>

        <div className="shell__context">
          <span className="shell__context-label">{contextLabel}</span>
          <span className="shell__context-name">{user?.name}</span>
        </div>

        <nav className="shell__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `shell__nav-link ${isActive ? 'shell__nav-link--active' : ''}`}
              onClick={() => setMobileNavOpen(false)}
            >
              <item.icon size={18} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="shell__logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </aside>

      {mobileNavOpen && <div className="shell__overlay" onClick={() => setMobileNavOpen(false)} />}

      <div className="shell__main">
        <header className="shell__topbar">
          <button
            className="shell__hamburger"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="shell__topbar-title">
            <span className="shell__topbar-eyebrow">{contextLabel}</span>
          </div>
          <div className="shell__topbar-user">{user?.name}</div>
        </header>

        <main className="shell__content">
          <Outlet />
        </main>

        <nav className="shell__bottombar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `shell__bottom-link ${isActive ? 'shell__bottom-link--active' : ''}`}
            >
              <item.icon size={20} strokeWidth={2} />
              <span>{item.label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
