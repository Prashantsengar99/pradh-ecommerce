// client/src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiFetch = (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;
  return fetch(url, options);
};

export const API_URL = API_BASE_URL;
export default apiFetch;
