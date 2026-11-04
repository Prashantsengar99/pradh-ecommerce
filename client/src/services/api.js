// client/src/services/api.js
// ✅ FIXED (FE-ADMIN-001): Now injects Authorization header + credentials + timeout
// This makes admin panel work (admin routes require verifyAdminToken middleware)

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiFetch = async (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;

  // ✅ FIXED: Complete admin route detection — pehle sirf /api/admin aur /get-orders
  // detect hota tha. Ab /api/coupons, /api/reviews, /api/return-requests, /api/delivery-charge
  // (PUT), aur /api/orders/:id (PUT) bhi admin token use karenge.
  // Note: Public endpoints (GET /api/delivery-charge, POST /api/coupons/validate, etc.)
  // pe bhi admin token bhej diya jaata hai — server ignore kar deta hai, koi harm nahi.
  const isAdminRoute =
    path.startsWith('/api/admin') ||
    path === '/get-orders' ||
    path === '/api/coupons' ||
    path.startsWith('/api/coupons/') ||          // /api/coupons/:code (DELETE admin), /api/coupons/validate (POST public — token ignored)
    path === '/api/reviews' ||                    // GET admin, POST public (token ignored)
    path.startsWith('/api/reviews/') ||           // /api/reviews/:id (PUT/DELETE admin), /api/reviews/product/:id (GET public — token ignored)
    path === '/api/return-requests' ||            // GET admin, POST public (token ignored)
    path.startsWith('/api/return-requests/') ||   // /:id (PUT/DELETE admin, GET semi-public)
    path === '/api/delivery-charge' ||            // GET public (token ignored), PUT admin
    /^\/api\/orders\/[^/]+$/.test(path);          // exactly /api/orders/:id (PUT admin) — but NOT /api/orders/:id/cancel or /return (user-auth POST)

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
