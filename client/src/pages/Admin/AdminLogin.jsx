import { apiFetch } from '../../services/api';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUserShield, FaUser, FaLock, FaEye, FaEyeSlash,
  FaSignInAlt, FaSpinner, FaExclamationCircle, FaCheckCircle, FaShieldAlt,
  FaBan, FaClock, FaMobileAlt, FaSyncAlt,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import '../../styles/admin-login.css';

const MAX_ATTEMPTS = 5;
const WARNING_THRESHOLD = 3;

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 🛡️ Server-driven security state
  const [securityState, setSecurityState] = useState({
    attemptsUsed: 0,
    attemptsRemaining: MAX_ATTEMPTS,
    locked: false,
    lockMinutesRemaining: 0,
    whatsappAlertSent: false,
    warningLevel: 'normal', // 'normal' | 'warning' | 'locked'
  });

  const lockCheckRef = useRef(null);

  // Check existing session
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      try {
        const res = await apiFetch('/api/admin/verify', {
          headers: { Authorization: 'Bearer ' + token },
        });
        const data = await res.json();
        if (data.success) {
          navigate('/admin/panel');
        } else {
          clearAdminStorage();
        }
      } catch (err) {
        clearAdminStorage();
      }
    };
    checkSession();
  }, [navigate]);

  // 🛡️ When username changes, check if that username is already locked from prior attempts
  // Also checks localStorage for client-side lock (fallback if backend not updated)
  useEffect(() => {
    if (!username.trim()) return;

    // First check localStorage (instant, no network)
    const storedExpiry = localStorage.getItem('adminLoginLockExpiry');
    const storedUser = localStorage.getItem('adminLoginLockUser');
    if (storedExpiry && storedUser === username.trim()) {
      const expiryMs = parseInt(storedExpiry, 10);
      const remainingMs = expiryMs - Date.now();
      if (remainingMs > 0) {
        const remainingMin = Math.ceil(remainingMs / 60000);
        setSecurityState({
          attemptsUsed: MAX_ATTEMPTS,
          attemptsRemaining: 0,
          locked: true,
          lockMinutesRemaining: remainingMin,
          whatsappAlertSent: false,
          warningLevel: 'locked',
        });
        return; // Skip server check, client-side lock is active
      } else {
        // Lock expired — clear it
        localStorage.removeItem('adminLoginLockExpiry');
        localStorage.removeItem('adminLoginLockUser');
      }
    }

    clearTimeout(lockCheckRef.current);
    lockCheckRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/admin/login-security/status?username=${encodeURIComponent(username.trim())}`);
        const data = await res.json();
        if (data.success && data.locked) {
          setSecurityState({
            attemptsUsed: data.attemptsUsed,
            attemptsRemaining: 0,
            locked: true,
            lockMinutesRemaining: data.lockMinutesRemaining || 0,
            whatsappAlertSent: data.whatsappAlertSent,
            warningLevel: 'locked',
          });
        } else if (data.success) {
          // Reset to fresh state only if not currently in a warning sequence
          setSecurityState((prev) => prev.locked ? {
            attemptsUsed: 0,
            attemptsRemaining: MAX_ATTEMPTS,
            locked: false,
            lockMinutesRemaining: 0,
            whatsappAlertSent: false,
            warningLevel: 'normal',
          } : prev);
        }
      } catch (err) {
        // Silent — don't expose status-check errors to attacker
      }
    }, 600);
    return () => clearTimeout(lockCheckRef.current);
  }, [username]);

  // 🛡️ On component mount: check if there's a lingering client-side lock
  useEffect(() => {
    const storedExpiry = localStorage.getItem('adminLoginLockExpiry');
    const storedUser = localStorage.getItem('adminLoginLockUser');
    if (storedExpiry && storedUser) {
      const expiryMs = parseInt(storedExpiry, 10);
      const remainingMs = expiryMs - Date.now();
      if (remainingMs > 0) {
        const remainingMin = Math.ceil(remainingMs / 60000);
        setSecurityState({
          attemptsUsed: MAX_ATTEMPTS,
          attemptsRemaining: 0,
          locked: true,
          lockMinutesRemaining: remainingMin,
          whatsappAlertSent: false,
          warningLevel: 'locked',
        });
        if (storedUser) setUsername(storedUser);
      } else {
        localStorage.removeItem('adminLoginLockExpiry');
        localStorage.removeItem('adminLoginLockUser');
      }
    }
  }, []);

  // 🛡️ Live countdown timer when locked
  useEffect(() => {
    if (!securityState.locked) return;
    const interval = setInterval(() => {
      setSecurityState((prev) => {
        if (!prev.locked) return prev;
        const next = Math.max(0, prev.lockMinutesRemaining - 1);
        if (next === 0) {
          // Unlock automatically when timer hits 0
          // Also clear localStorage lock (client-side fallback)
          localStorage.removeItem('adminLoginLockExpiry');
          localStorage.removeItem('adminLoginLockUser');
          return {
            attemptsUsed: 0,
            attemptsRemaining: MAX_ATTEMPTS,
            locked: false,
            lockMinutesRemaining: 0,
            whatsappAlertSent: false,
            warningLevel: 'normal',
          };
        }
        return { ...prev, lockMinutesRemaining: next };
      });
    }, 60000); // tick every minute
    return () => clearInterval(interval);
  }, [securityState.locked]);

  const clearAdminStorage = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminLoggedIn');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // 🛡️ Block submission if locked
    if (securityState.locked) {
      setError(`🔒 Account is locked. Please wait ${securityState.lockMinutesRemaining} minute${securityState.lockMinutesRemaining !== 1 ? 's' : ''} before trying again.`);
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const text = await res.text();
      if (!text || text.trim() === '') {
        throw new Error('Server returned empty response. Check server is running.');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('Server sent invalid response.');
      }

      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        localStorage.setItem('adminLoggedIn', 'true');

        setSuccess(true);
        setSecurityState({
          attemptsUsed: 0,
          attemptsRemaining: MAX_ATTEMPTS,
          locked: false,
          lockMinutesRemaining: 0,
          whatsappAlertSent: false,
          warningLevel: 'normal',
        });
        toast.success('Login successful! 🎉');

        setTimeout(() => {
          navigate('/admin/panel');
        }, 1500);
      } else {
        // 🛡️ Update security state from server response
        // Fallback: if server didn't return attemptsUsed (old backend), increment client-side
        const serverAttemptsUsed = typeof data.attemptsUsed === 'number' ? data.attemptsUsed : null;
        const attemptsUsed = serverAttemptsUsed !== null ? serverAttemptsUsed : securityState.attemptsUsed + 1;
        const attemptsRemaining = typeof data.attemptsRemaining === 'number'
          ? data.attemptsRemaining
          : Math.max(0, MAX_ATTEMPTS - attemptsUsed);

        // 🛡️ LOCK TRIGGER — either server says locked, OR client-side counter hits 5
        // (Client-side lock is a fallback in case backend wasn't updated/restarted)
        const serverLocked = !!data.locked;
        const clientSideLockTriggered = attemptsUsed >= MAX_ATTEMPTS && !serverLocked;
        const isLocked = serverLocked || clientSideLockTriggered;

        const lockMin = data.lockMinutesRemaining || (clientSideLockTriggered ? 30 : 0);
        const whatsappSent = !!data.whatsappAlertSent;
        const warningLevel = isLocked
          ? 'locked'
          : (attemptsUsed >= WARNING_THRESHOLD ? 'warning' : 'normal');

        setSecurityState({
          attemptsUsed,
          attemptsRemaining: isLocked ? 0 : attemptsRemaining,
          locked: isLocked,
          lockMinutesRemaining: lockMin,
          whatsappAlertSent: whatsappSent,
          warningLevel,
        });

        // 🛡️ Persist client-side lock in localStorage (so refresh doesn't bypass it)
        if (clientSideLockTriggered) {
          const lockExpiry = Date.now() + lockMin * 60 * 1000;
          localStorage.setItem('adminLoginLockExpiry', String(lockExpiry));
          localStorage.setItem('adminLoginLockUser', username.trim());
          console.warn('🛡️ Client-side lock activated (backend may not have new security code). Lock expires at:', new Date(lockExpiry).toLocaleString());
        }

        // Clear password field on failed attempt (force re-type)
        setPassword('');

        // Show contextual toast
        if (isLocked) {
          toast.error(`🔒 Account locked for ${lockMin} min. Try again later.`, { duration: 6000 });
        } else if (warningLevel === 'warning') {
          toast.error(`⚠️ Only ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} left before lock!`, { duration: 5000 });
        } else {
          toast.error(`❌ ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining`, { duration: 3000 });
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 🛡️ Progress bar percentage
  const progressPct = Math.min(100, (securityState.attemptsUsed / MAX_ATTEMPTS) * 100);

  return (
    <div className="admin-login-page">
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <div className="admin-login-container">
        <div className="admin-logo">
          <div className="shield-icon">
            <FaUserShield />
          </div>
          <h1>PRADH <span>Admin</span></h1>
          <p>Secure Control Panel Access</p>
          <span className="sub-badge">🔐 Brute-Force Protected</span>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label><FaUser /> Username</label>
            <input
              type="text"
              placeholder="Enter admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              disabled={securityState.locked}
            />
          </div>

          <div className="form-group">
            <label><FaLock /> Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={securityState.locked}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={securityState.locked}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading || securityState.locked}>
            {loading ? (
              <><FaSpinner className="spinner" /> Logging in...</>
            ) : securityState.locked ? (
              <><FaBan /> Locked — Try later</>
            ) : (
              <><FaSignInAlt /> Login</>
            )}
          </button>

          {error && (
            <div className="error-msg">
              <FaExclamationCircle /> {error}
            </div>
          )}

          {success && (
            <div className="success-msg">
              <FaCheckCircle /> Login successful! Redirecting...
            </div>
          )}

          {/* 🛡️ Attempt Progress Bar — shown when there's any failed attempt */}
          {securityState.attemptsUsed > 0 && !securityState.locked && (
            <div className={`attempts-progress ${securityState.warningLevel === 'warning' ? 'warning' : ''}`}>
              <div className="attempts-header">
                <FaShieldAlt />
                <span>Failed attempts: <strong>{securityState.attemptsUsed}</strong> / {MAX_ATTEMPTS}</span>
              </div>
              <div className="attempts-bar-track">
                <div
                  className={`attempts-bar-fill ${securityState.warningLevel}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className={`attempts-remaining ${securityState.warningLevel}`}>
                {securityState.attemptsRemaining} attempt{securityState.attemptsRemaining !== 1 ? 's' : ''} remaining
                {securityState.warningLevel === 'warning' && ' ⚠️'}
              </div>
            </div>
          )}

          {/* 🛡️ LOCKED STATE — full-width warning */}
          {securityState.locked && (
            <div className="lock-warning">
              <div className="lock-icon-big"><FaBan /></div>
              <div className="lock-title">Account Temporarily Locked</div>
              <div className="lock-detail">
                <FaClock /> Try again in <strong>{securityState.lockMinutesRemaining} min</strong>
              </div>
              {securityState.whatsappAlertSent && (
                <div className="whatsapp-alert-badge">
                  <FaMobileAlt /> WhatsApp alert sent to admin
                </div>
              )}
              <div className="lock-hint">
                For emergency unlock, contact server admin or wait for cooldown.
              </div>
            </div>
          )}

          {/* 🛡️ Security notice when not locked and no attempts yet */}
          {securityState.attemptsUsed === 0 && !securityState.locked && (
            <div className="security-notice">
              <FaShieldAlt /> Max {MAX_ATTEMPTS} attempts • WhatsApp alert after {WARNING_THRESHOLD} fails
            </div>
          )}
        </form>

        <div className="footer-text">
          <span className="lock-icon"><FaShieldAlt /></span>
          Secure Admin Access • <Link to="/">← Back to Store</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
