// ✅ FIXED: Local dev uses Vite proxy (empty URL), production uses Render URL

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://pradh-ecommerce.onrender.com');

export const apiFetch = async (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;

  const isAdminRoute =
    path.startsWith('/api/admin') ||
    path === '/get-orders' ||
    path === '/api/coupons' ||
    path.startsWith('/api/coupons/') ||
    path === '/api/reviews' ||
    path.startsWith('/api/reviews/') ||
    path === '/api/return-requests' ||
    path.startsWith('/api/return-requests/') ||
    path === '/api/delivery-charge' ||
    path === '/api/wheel-settings' ||
    path === '/api/announcement-settings' ||
    path === '/api/theme-settings' ||
    /^\/api\/orders\/[^/]+$/.test(path);

  const token = isAdminRoute
    ? localStorage.getItem('adminToken')
    : localStorage.getItem('token');

  const headers = { ...(options.headers || {}) };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, { ...options, headers, signal: options.signal || controller.signal });

    if (res.status === 401 && isAdminRoute && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminLoggedIn');
      if (window.location.pathname !== '/admin') window.location.href = '/admin';
    }

    if (res.status === 401 && !isAdminRoute && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
