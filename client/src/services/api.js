// client/src/services/api.js
// ✅ FIXED (FE-ADMIN-001): Now injects Authorization header + credentials + timeout
// This makes admin panel work (admin routes require verifyAdminToken middleware)

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiFetch = async (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;

  // Determine which token to use: admin routes use adminToken, everything else uses user token
  const isAdminRoute = path.startsWith('/api/admin') || path === '/get-orders';
  const token = isAdminRoute
    ? localStorage.getItem('adminToken')
    : localStorage.getItem('token');

  // Build headers
  const headers = {
    ...(options.headers || {}),
  };

  // Inject Authorization header if token exists
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Add Content-Type for POST/PUT/PATCH with body
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Timeout — abort after 20 seconds (Render cold start can take 30s, so be generous)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    // Auto-logout on 401 from admin routes (token expired/invalid)
    if (res.status === 401 && isAdminRoute && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminLoggedIn');
      // Redirect to admin login
      if (window.location.pathname !== '/admin') {
        window.location.href = '/admin';
      }
    }

    // Auto-logout on 401 from user routes
    if (res.status === 401 && !isAdminRoute && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
    }

    return res;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout — server may be sleeping. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const API_URL = API_BASE_URL;
export default apiFetch;
