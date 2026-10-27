import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUserShield, FaUser, FaLock, FaEye, FaEyeSlash,
  FaSignInAlt, FaSpinner, FaExclamationCircle, FaCheckCircle, FaShieldAlt,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import '../../styles/admin-login.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      try {
        const res = await fetch('/api/admin/verify', {
          headers: { Authorization: 'Bearer ' + token },
        });
        const data = await res.json();
        if (data.success) {
          navigate('/admin/panel');
        } else {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          localStorage.removeItem('adminLoggedIn');
        }
      } catch (err) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminLoggedIn');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
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
        toast.success('Login successful! 🎉');

        setTimeout(() => {
          navigate('/admin/panel');
        }, 1500);
      } else {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        setError(`${data.error || 'Invalid credentials'} (${newAttempts}/${MAX_ATTEMPTS})`);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <span className="sub-badge">🔐 Secure Login</span>
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
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <><FaSpinner className="spinner" /> Logging in...</>
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

          {loginAttempts > 0 && (
            <div className="attempts-counter">
              <FaShieldAlt /> Failed attempts: <span className="count">{loginAttempts}</span>/{MAX_ATTEMPTS}
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