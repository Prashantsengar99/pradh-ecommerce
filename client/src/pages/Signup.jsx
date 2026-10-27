import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUserPlus, FaSpinner } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import toast from 'react-hot-toast';
import '../styles/signup.css';

const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/account', { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError('⚠️ Please fill all required fields');
      return;
    }

    if (form.password.length < 6) {
      setError('⚠️ Password must be at least 6 characters');
      return;
    }

    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('⚠️ Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('✅ ' + (data.message || 'Account created successfully!'));

        // Save token + user
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        toast.success('Welcome to PRADH family! 🎉');

        // Redirect
        setTimeout(() => {
          navigate('/account');
        }, 1200);
      } else {
        setError(data.message || '❌ Signup failed');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('❌ Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    toast.success(`🔜 ${provider} signup coming soon!`);
  };

  return (
    <div className="signup-page">
      {/* Particles */}
      <div className="signup-particle"></div>
      <div className="signup-particle"></div>
      <div className="signup-particle"></div>
      <div className="signup-particle"></div>
      <div className="signup-particle"></div>

      <div className="signup-container">
        {/* Logo */}
        <div className="signup-logo">
          <img src="/logo.jpeg" alt="PRADH DESI FUEL" />
          <h1>PRADH <span>Desi Fuel</span></h1>
        </div>

        {/* Title */}
        <div className="signup-title">Create Account</div>
        <div className="signup-subtitle">Join the PRADH family 💪</div>

        {/* Messages */}
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <FaUser /> Full Name
            </label>
            <input
              type="text"
              id="username"
              placeholder="Enter your full name"
              value={form.username}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>
              <FaEnvelope /> Email Address
            </label>
            <input
              type="email"
              id="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
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
                id="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-signup" disabled={loading}>
            {loading ? (
              <>
                <FaSpinner className="fa-spin" /> Creating...
              </>
            ) : (
              <>
                <FaUserPlus /> Create Account
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="divider">or sign up with</div>

        {/* Social */}
        <div className="social-login">
          <button
            type="button"
            className="btn-social"
            onClick={() => handleSocialLogin('Google')}
          >
            <FcGoogle /> Google
          </button>
          <button
            type="button"
            className="btn-social"
            onClick={() => handleSocialLogin('Facebook')}
          >
            <FaFacebook style={{ color: '#1877f2' }} /> Facebook
          </button>
        </div>

        {/* Terms */}
        <div className="terms">
          By signing up, you agree to our{' '}
          <a href="#">Terms of Service</a> &amp; <a href="#">Privacy Policy</a>
        </div>

        {/* Footer */}
        <div className="signup-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;