/*
 * useAuth Hook
 *
 * Manages admin authentication state.
 * - Checks existing token on mount
 * - Provides login/logout functions
 * - Handles token expiry (401 → auto logout)
 *
 * Usage:
 *   const { isAdmin, user, login, logout, authLoading } = useAuth();
 */

import { useState, useEffect, useCallback } from 'react';
import { api, auth } from '../utils/api';

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // Check existing token on mount

  // ── Check existing token on mount ──────────────────────────────
  useEffect(() => {
    async function checkToken() {
      if (!auth.isLoggedIn()) {
        setAuthLoading(false);
        return;
      }

      const res = await api.getMe();
      if (res.success) {
        setIsAdmin(true);
        setUser(res.data);
      } else {
        // Token is expired or invalid — clear it
        auth.clearToken();
        setIsAdmin(false);
        setUser(null);
      }
      setAuthLoading(false);
    }

    checkToken();
  }, []);

  // ── Login ──────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    const res = await api.login(username, password);
    if (res.success) {
      auth.setToken(res.data.token);
      setIsAdmin(true);
      setUser(res.data.user);
      return { success: true };
    }
    return {
      success: false,
      error: res.error || 'Login failed. Check your credentials.',
      code: res.code,
    };
  }, []);

  // ── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await api.logout().catch(() => {}); // Best-effort server logout
    auth.clearToken();
    setIsAdmin(false);
    setUser(null);
  }, []);

  return { isAdmin, user, authLoading, login, logout };
}

export default useAuth;
