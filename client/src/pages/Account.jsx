import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUserCircle, FaEnvelope, FaUserShield, FaTachometerAlt,
  FaSignInAlt, FaSignOutAlt, FaShoppingBag,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import '/src/styles/account.css';

const Account = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

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

  const isLoggedIn = !!(token && user);

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
        {/* Profile Header */}
        <div className="profile-header">
          <FaUserCircle />
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

        {/* Action Grid */}
        <div className="action-grid">
          {/* Admin Access */}
          <Link to="/admin" className="action-card admin-access">
            <FaUserShield />
            <span>Admin Access</span>
          </Link>

          {/* User Dashboard */}
          <Link to={isLoggedIn ? '/dashboard' : '/login'} className="action-card dashboard">
            <FaTachometerAlt />
            <span>User Dashboard</span>
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

          {/* My Orders */}
          <Link to={isLoggedIn ? '/orders' : '/login'} className="action-card orders">
            <FaShoppingBag />
            <span>My Orders</span>
          </Link>
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
      </div>
    </div>
  );
};

export default Account;