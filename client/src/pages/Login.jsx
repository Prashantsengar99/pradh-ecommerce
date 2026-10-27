import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaSignInAlt, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import '/src/styles/login.css';

const Login = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-fill saved username
  useEffect(() => {
    if (localStorage.getItem('rememberMe')) {
      const savedUser = localStorage.getItem('savedUsername');
      if (savedUser) {
        setUsername(savedUser);
        setRememberMe(true);
      }
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/account', { replace: true });
    }
  }, [navigate]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password) {
      setError('⚠️ Please fill all fields');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('✅ Login successful! Redirecting...');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Remember me
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('savedUsername', username);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('savedUsername');
        }

        // Show toast
        toast.success('Welcome back! 🎉');

        // Redirect
        setTimeout(() => {
          const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/account';
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(redirectUrl);
        }, 1000);
      } else {
        setError(data.message || '❌ Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('❌ Network error: Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // Social login (demo)
  const handleSocialLogin = (provider) => {
    toast.success(`🔜 ${provider} login coming soon!`);
  };

  return (
    <div className="login-page">
      {/* Floating Particles */}
      <div className="login-particle"></div>
      <div className="login-particle"></div>
      <div className="login-particle"></div>
      <div className="login-particle"></div>
      <div className="login-particle"></div>

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <img src="/logo.jpeg" alt="PRADH DESI FUEL" />
          <h1>PRADH <span>Desi Fuel</span></h1>
          <p>💪 Pure Desi Protein Fuel</p>
        </div>

        {/* Title */}
        <div className="login-title">Welcome Back!</div>
        <div className="login-subtitle">Login to your PRADH account 🏋️</div>

        {/* Messages */}
        {error && <div className={`error-msg ${error ? 'show' : ''}`}>{error}</div>}
        {success && <div className={`success-msg ${success ? 'show' : ''}`}>{success}</div>}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <FaUser /> Username or Email
            </label>
            <input
              type="text"
              placeholder="Enter your username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label>
              <FaLock /> Password
            </label>
            <div className="input-icon">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <a href="#">Forgot password?</a>
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <>
                <FaSpinner className="fa-spin" /> Logging in...
              </>
            ) : (
              <>
                <FaSignInAlt /> Login
              </>
            )}
          </button>
        </form>

        {/* Guest Link */}
        <div className="guest-link">
          <Link to="/">
            <FaArrowLeft /> Continue as Guest
          </Link>
        </div>

        {/* Footer */}
        <div className="login-footer">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;