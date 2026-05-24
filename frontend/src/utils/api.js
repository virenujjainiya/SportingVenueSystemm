/*
 * REST API Helper — with JWT Auth support
 *
 * Wraps fetch with:
 * - Automatic JSON parsing
 * - Bearer token injection (for admin routes)
 * - Error handling with structured error codes
 * - Request timeout (8 seconds)
 * - Auth token storage/retrieval
 *
 * All functions return: { success: boolean, data?: any, error?: string, code?: string }
 */

import { API_BASE } from './constants';

const DEFAULT_TIMEOUT = 8000;

// ── Token Management ─────────────────────────────────────────────
const TOKEN_KEY = 'venueflow_admin_token';

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
};

// ── Core Request ─────────────────────────────────────────────────
async function request(path, options = {}, requiresAuth = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach JWT token for authenticated requests
  if (requiresAuth) {
    const token = auth.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeout);

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Return structured error from backend
      return {
        success: false,
        code: json.code || `HTTP_${response.status}`,
        error: json.message || `Request failed with status ${response.status}`,
        errors: json.errors || [],
        status: response.status,
      };
    }

    return json;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return { success: false, code: 'TIMEOUT', error: 'Request timed out. Please try again.' };
    }
    if (!navigator.onLine) {
      return { success: false, code: 'OFFLINE', error: 'You are offline. Please check your connection.' };
    }
    return { success: false, code: 'NETWORK_ERROR', error: error.message };
  }
}

// ── Public API (no auth) ─────────────────────────────────────────
export const api = {
  // Auth
  login: (username, password) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  logout: () => request('/api/auth/logout', { method: 'POST' }, true),
  getMe: () => request('/api/auth/me', {}, true),
  refreshToken: () => request('/api/auth/refresh', { method: 'POST' }, true),

  // Venue (public)
  getVenue: () => request('/api/venue'),

  // Zones (public read, admin write)
  getZones: () => request('/api/zones'),
  getZone: (id) => request(`/api/zones/${id}`),
  updateZone: (id, data) => request(`/api/zones/${id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, true), // ← auth required

  // Queues (public read, admin write)
  getQueues: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/queues${query ? `?${query}` : ''}`);
  },
  getRecommendations: (type) => request(`/api/queues/recommend${type ? `?type=${type}` : ''}`),
  updateQueue: (id, data) => request(`/api/queues/${id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, true), // ← auth required

  // Feed (public read, admin write)
  getFeed: (limit = 50) => request(`/api/feed?limit=${limit}`),
  postFeed: (data) => request('/api/feed', {
    method: 'POST',
    body: JSON.stringify(data),
  }, true), // ← auth required

  // Stats (public)
  getStats: () => request('/api/stats'),

  // Health
  health: () => request('/health'),
};

export default api;
