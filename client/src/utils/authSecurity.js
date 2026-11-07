// ============================================================
// 🛡️ PRADH DESI FUEL — AUTH SECURITY UTILITY
// Handles: token expiry tracking, auto-logout, session warnings,
// device info parsing for client-side display.
// ============================================================

const SESSION_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 min before expiry
const CHECK_INTERVAL_MS = 60 * 1000; // check every 1 minute

/**
 * Decode JWT payload (without verifying signature — client-side only).
 * Returns { exp, iat, sessionId, ... } or null if invalid.
 */
export const decodeToken = (token) => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
};

/**
 * Get token expiry timestamp (ms since epoch) or null.
 */
export const getTokenExpiry = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return null;
  return decoded.exp * 1000; // JWT exp is in seconds, convert to ms
};

/**
 * Get time until expiry (ms). Negative if already expired.
 */
export const getTimeUntilExpiry = (token) => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return null;
  return expiry - Date.now();
};

/**
 * Format milliseconds as a human-readable countdown.
 * e.g., "23h 45m", "12m 30s", "Expired"
 */
export const formatTimeUntilExpiry = (token) => {
  const ms = getTimeUntilExpiry(token);
  if (ms === null) return 'Unknown';
  if (ms <= 0) return 'Expired';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

/**
 * Is the token expired?
 */
export const isTokenExpired = (token) => {
  const ms = getTimeUntilExpiry(token);
  return ms === null || ms <= 0;
};

/**
 * Should we show a session expiry warning? (less than 5 min left)
 */
export const shouldWarnExpiry = (token) => {
  const ms = getTimeUntilExpiry(token);
  if (ms === null) return false;
  return ms > 0 && ms <= SESSION_WARNING_THRESHOLD_MS;
};

/**
 * Force logout — clears all auth storage and redirects to /login.
 * Optionally shows a toast message via the callback.
 */
export const forceLogout = (reason = 'Session expired', showToast) => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('rememberMe');
  } catch {}

  if (typeof showToast === 'function') {
    showToast(reason);
  }

  // Redirect to login after small delay (so toast can show)
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup') {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&reason=expired`;
      }
    }, 1200);
  }
};

/**
 * Start a session watcher that:
 * 1. Checks every minute if the token is expired → force logout
 * 2. Triggers warning callback when < 5 min remaining
 * 3. Listens for storage events (logout from another tab)
 *
 * Returns a cleanup function to clear the interval.
 *
 * Usage (in App.jsx or main.jsx):
 *   useEffect(() => startSessionWatcher({ onWarn, onExpire }), [])
 */
export const startSessionWatcher = ({ onWarn, onExpire } = {}) => {
  let warningShown = false;

  const check = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // 1. Expired → force logout
    if (isTokenExpired(token)) {
      console.log('[Auth] Token expired, forcing logout');
      forceLogout('Your session has expired. Please login again.', onExpire);
      return;
    }

    // 2. Warning threshold → show warning once
    if (shouldWarnExpiry(token) && !warningShown) {
      warningShown = true;
      const timeLeft = formatTimeUntilExpiry(token);
      console.log(`[Auth] Session expiring soon (${timeLeft} left)`);
      if (typeof onWarn === 'function') {
        onWarn(timeLeft);
      }
    }

    // Reset warning if user somehow got more time (e.g., re-login in another tab)
    if (!shouldWarnExpiry(token)) {
      warningShown = false;
    }
  };

  // Check immediately
  check();

  // Then every minute
  const interval = setInterval(check, CHECK_INTERVAL_MS);

  // Listen for storage events (multi-tab logout)
  const storageHandler = (e) => {
    if (e.key === 'token' && !e.newValue) {
      // Token was cleared in another tab — logout here too
      console.log('[Auth] Token cleared in another tab, logging out');
      if (typeof onExpire === 'function') {
        onExpire('Logged out from another tab');
      } else {
        forceLogout('Logged out from another tab');
      }
    }
  };
  window.addEventListener('storage', storageHandler);

  // Cleanup function
  return () => {
    clearInterval(interval);
    window.removeEventListener('storage', storageHandler);
  };
};

/**
 * Get stored session ID from localStorage.
 */
export const getSessionId = () => {
  try {
    return localStorage.getItem('sessionId') || null;
  } catch {
    return null;
  }
};

/**
 * Save session ID + token + user after login/signup.
 */
export const saveAuthData = ({ token, sessionId, user, expiresIn }) => {
  try {
    if (token) localStorage.setItem('token', token);
    if (sessionId) localStorage.setItem('sessionId', sessionId);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    if (expiresIn) localStorage.setItem('sessionExpiresAt', Date.now() + expiresIn);
  } catch {}
};

/**
 * Parse current device info from navigator.userAgent (client-side).
 * Used for display in the "current device" indicator.
 */
export const getCurrentDeviceInfo = () => {
  if (typeof navigator === 'undefined') {
    return { deviceType: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  }
  const ua = navigator.userAgent || '';
  const uaLower = ua.toLowerCase();

  let deviceType = 'Desktop';
  if (/ipad|tablet|playbook|silk/.test(uaLower)) deviceType = 'Tablet';
  else if (/mobile|iphone|ipod|android.*mobile|opera mini|iemobile|blackberry/.test(uaLower)) deviceType = 'Mobile';

  let browser = 'Unknown';
  if (/edg\//.test(uaLower)) browser = 'Microsoft Edge';
  else if (/opr\/|opera/.test(uaLower)) browser = 'Opera';
  else if (/chrome|crios/.test(uaLower) && !/edg/.test(uaLower)) browser = 'Chrome';
  else if (/firefox|fxios/.test(uaLower)) browser = 'Firefox';
  else if (/safari/.test(uaLower) && !/chrome/.test(uaLower)) browser = 'Safari';

  let os = 'Unknown';
  if (/windows nt 10/.test(uaLower)) os = 'Windows 10/11';
  else if (/windows nt/.test(uaLower)) os = 'Windows';
  else if (/mac os x|macintosh/.test(uaLower)) os = 'macOS';
  else if (/android/.test(uaLower)) os = 'Android';
  else if (/iphone|ipad|ipod/.test(uaLower)) os = 'iOS';
  else if (/linux/.test(uaLower)) os = 'Linux';

  return { deviceType, browser, os };
};

/**
 * Format a relative time string from a date.
 * e.g., "2 minutes ago", "3 hours ago", "Just now"
 */
export const formatRelativeTime = (date) => {
  if (!date) return 'Unknown';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 30) return 'Just now';
  if (min < 1) return `${sec} seconds ago`;
  if (min === 1) return '1 minute ago';
  if (min < 60) return `${min} minutes ago`;
  if (hr === 1) return '1 hour ago';
  if (hr < 24) return `${hr} hours ago`;
  if (day === 1) return '1 day ago';
  return `${day} days ago`;
};

/**
 * Get an emoji/icon for a device type.
 */
export const getDeviceIcon = (deviceType) => {
  switch (deviceType) {
    case 'Mobile': return '📱';
    case 'Tablet': return '📲';
    case 'Desktop': return '💻';
    case 'Bot': return '🤖';
    default: return '🖥️';
  }
};
