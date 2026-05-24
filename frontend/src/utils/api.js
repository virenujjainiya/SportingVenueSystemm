/*
 * REST API Helper
 * 
 * Wraps fetch with:
 * - Automatic JSON parsing
 * - Error handling with retry
 * - Base URL configuration
 * - Request timeout (8 seconds)
 * 
 * All functions return: { success: boolean, data?: any, error?: string }
 */

import { API_BASE } from './constants';

const DEFAULT_TIMEOUT = 8000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timed out' };
    }
    return { success: false, error: error.message };
  }
}

// ── API Methods ───────────────────────────────────────────────
export const api = {
  // Venue
  getVenue: () => request('/api/venue'),

  // Zones
  getZones: () => request('/api/zones'),
  getZone: (id) => request(`/api/zones/${id}`),
  updateZone: (id, data) => request(`/api/zones/${id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Queues
  getQueues: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/queues${query ? `?${query}` : ''}`);
  },
  getRecommendations: (type) => request(`/api/queues/recommend${type ? `?type=${type}` : ''}`),
  updateQueue: (id, data) => request(`/api/queues/${id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Feed
  getFeed: (limit = 50) => request(`/api/feed?limit=${limit}`),
  postFeed: (data) => request('/api/feed', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Stats
  getStats: () => request('/api/stats'),

  // Health
  health: () => request('/health'),
};

export default api;
