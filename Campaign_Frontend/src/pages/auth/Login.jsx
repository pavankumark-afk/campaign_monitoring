import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const profile = await login(username.trim(), password);
      const from = location.state?.from?.pathname;
      const home = profile.role === 'super_admin' ? '/admin' : '/ac';
      navigate(from && from !== '/login' ? from : home, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Invalid username or password. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__mark">
          <span className="login__mark-badge">SIR</span>
          <span className="login__mark-sub">Monitoring Portal</span>
        </div>
        <h1 className="login__heading">Sign in</h1>
        <p className="login__subheading">Use the credentials issued for your AC or admin role.</p>

        {error && <div className="login__error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="e.g. ac012 or superadmin"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn--primary login__submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="spin" /> : null}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login__footnote">Trouble logging in? Contact your district coordinator.</p>
      </div>
    </div>
  );
}
