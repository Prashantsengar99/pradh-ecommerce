import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUserCircle, FaEnvelope, FaTachometerAlt,
  FaSignInAlt, FaSignOutAlt, FaShoppingBag, FaTruck,
  FaUserShield, FaKey,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import '/src/styles/account.css';

// ============================================================
// 🤫 SECRET ADMIN ACCESS (Flipkart-style hidden entry)
// Tap profile avatar 5 times within 2.5 seconds to reveal.
// Regular users will never see this; admin knows the gesture.
// Direct URL /admin also works (no UI button needed).
// ============================================================
const ADMIN_TAP_THRESHOLD = 5;       // taps required
const ADMIN_TAP_WINDOW_MS = 2500;    // within 2.5 seconds
const ADMIN_REVEAL_DURATION_MS = 30000; // visible for 30s after reveal

const Account = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Secret admin access state
  const tapCountRef = useRef(0);
  const firstTapTimeRef = useRef(0);
  const revealTimerRef = useRef(null);
  const [adminRevealed, setAdminRevealed] = useState(false);
  const [tapFeedback, setTapFeedback] = useState(0); // 0 = none, 1-4 = progress

  // Load user from localStorage
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('token');
      const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
      setToken(savedToken);
      setUser(savedUser);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  // Cleanup reveal timer on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  const isLoggedIn = !!(token && user);

  // 🤫 Secret admin tap handler
  const handleAvatarTap = () => {
    const now = Date.now();

    // Reset counter if window expired
    if (now - firstTapTimeRef.current > ADMIN_TAP_WINDOW_MS) {
      tapCountRef.current = 0;
      firstTapTimeRef.current = now;
    }

    tapCountRef.current += 1;
    const currentTaps = tapCountRef.current;

    if (currentTaps >= ADMIN_TAP_THRESHOLD) {
      // Reveal admin access!
      tapCountRef.current = 0;
      setAdminRevealed(true);
      setTapFeedback(0);
      toast.success('Admin access unlocked', { duration: 2000 });

      // Auto-hide after 30 seconds
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(() => {
        setAdminRevealed(false);
      }, ADMIN_REVEAL_DURATION_MS);
      return;
    }

    // Show subtle tap progress (no text — just visual feedback)
    if (currentTaps > 1) {
      setTapFeedback(currentTaps);
      // Clear feedback after 1 second if no more taps
      setTimeout(() => {
        setTapFeedback((prev) => (prev === currentTaps ? 0 : prev));
      }, 800);
    }
  };

  const handleAdminClick = () => {
    setAdminRevealed(false);
    navigate('/admin');
  };

  // Handle logout
  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="account-page-wrapper">
      {/* Background effects */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <div className="particle-bg">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>

      {/* Main container */}
      <div className="account-container">
        {/* Profile Header — avatar is now clickable (secret admin trigger) */}
        <div className="profile-header">
          <button
            type="button"
            className={`profile-avatar-trigger ${tapFeedback > 0 ? 'tapping' : ''}`}
            onClick={handleAvatarTap}
            aria-label="Profile"
            style={{ '--tap-progress': tapFeedback }}
          >
            <FaUserCircle />
            {tapFeedback > 0 && (
              <span className="tap-ring" aria-hidden="true" />
            )}
          </button>
          <h2>
            {isLoggedIn ? `Welcome ${user.username || 'User'}!` : 'Welcome Guest'}
          </h2>
          <p>
            {isLoggedIn ? '✅ Logged in successfully' : 'Manage your account settings'}
          </p>
          <div className="user-email">
            <FaEnvelope />
            <span>{isLoggedIn ? user.email : 'Not logged in'}</span>
          </div>
        </div>

        {/* Action Grid — 4 clean cards, no admin */}
        <div className="action-grid">
          {/* User Dashboard */}
          <Link to={isLoggedIn ? '/dashboard' : '/login'} className="action-card dashboard">
            <FaTachometerAlt />
            <span>My Dashboard</span>
          </Link>

          {/* Continue Shopping (replaces My Orders) */}
          <Link to="/products" className="action-card continue-shopping">
            <FaShoppingBag />
            <span>Continue Shopping</span>
          </Link>

          {/* Track Order (new — quick access) */}
          <Link to={isLoggedIn ? '/dashboard' : '/login'} className="action-card track-order">
            <FaTruck />
            <span>Track Order</span>
          </Link>

          {/* Login / Logout */}
          {isLoggedIn ? (
            <button className="action-card logout" onClick={handleLogout}>
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          ) : (
            <Link to="/login" className="action-card login">
              <FaSignInAlt />
              <span>User Login</span>
            </Link>
          )}
        </div>

        {/* Account Check Box */}
        <div className="account-check-box">
          <p>
            {isLoggedIn ? 'Manage your account' : "You don't have an account?"}
          </p>

          {isLoggedIn ? (
            <Link to="/dashboard" className="create-account-link">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/signup" className="create-account-link">
              Create Account
            </Link>
          )}
        </div>

        {/* 🤫 SECRET ADMIN LINK — only visible after 5 taps on avatar */}
        {adminRevealed && (
          <div className="secret-admin-reveal">
            <FaKey className="reveal-icon" />
            <span>Staff access unlocked</span>
            <button onClick={handleAdminClick} className="secret-admin-btn">
              <FaUserShield />
              Admin Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
