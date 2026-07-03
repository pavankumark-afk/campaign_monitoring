import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { requestOtp, verifyOtp } from '../../api/auth';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const navigate = useNavigate();
  const location = useLocation();

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const handleRequestOtp = async (e) => {
    e && e.preventDefault();
    setError('');
    setIsSendingOtp(true);
    try {
      await requestOtp(mobile.trim());
      setStep('verify');
    } catch (err) {
      setError(err?.message || 'Unable to request OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e && e.preventDefault();
    setError('');
    setIsVerifyingOtp(true);
    try {
      const res = await verifyOtp(mobile.trim(), otp.trim());
      // Backend returns { status: 'success', data: { user: {...} } }
      const userData = res?.data?.user || res?.user || res;
      const profile = {
        id: userData.id,
        name: userData.name,
        role: userData.role,
        acId: userData.ac_id ?? userData.acId ?? null,
        acName: userData.ac_name ?? null,
      };
      await login(profile);
      const from = location.state?.from?.pathname;
      const home = profile.role === 'super_admin' ? '/admin' : '/ac';
      navigate(from && from !== '/login' ? from : home, { replace: true });
    } catch (err) {
      setError(err?.message || 'OTP verification failed');
    } finally {
      setIsVerifyingOtp(false);
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

        <form onSubmit={step === 'request' ? handleRequestOtp : handleVerifyOtp}>
          <div className="field">
            <label htmlFor="mobile">Mobile Number</label>
            <input
              id="mobile"
              type="tel"
              autoComplete="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              placeholder="e.g. 9876543210"
              disabled={step === 'verify'}
            />
          </div>

          {step === 'verify' && (
            <div className="field">
              <label htmlFor="otp">One-time passcode</label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="Enter 6-digit code"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
          )}

          {step === 'request' ? (
            <button type="submit" className="btn btn--primary login__submit" disabled={isSendingOtp}>
              {isSendingOtp ? <Loader2 size={16} className="spin" /> : null}
              {isSendingOtp ? 'Sending…' : 'Send OTP'}
            </button>
          ) : (
            <button type="submit" className="btn btn--primary login__submit" disabled={isVerifyingOtp}>
              {isVerifyingOtp ? <Loader2 size={16} className="spin" /> : null}
              {isVerifyingOtp ? 'Verifying…' : 'Verify & Sign in'}
            </button>
          )}
        </form>

        <p className="login__footnote">Trouble logging in? Contact your district coordinator.</p>
      </div>
    </div>
  );
}
