/*
 * useVenueData Hook
 * 
 * Central state manager for all venue data.
 * - Fetches initial data via REST API
 * - Subscribes to Socket.IO for real-time updates
 * - Merges updates efficiently (no full re-fetch)
 * - Provides loading/error states
 * 
 * This is the SINGLE SOURCE OF TRUTH for the UI.
 * All components consume data from this hook.
 * 
 * Usage:
 *   const {
 *     venue, zones, queues, feed, stats,
 *     isLoading, error, isConnected,
 *     toasts, dismissToast
 *   } = useVenueData();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import api from '../utils/api';

export function useVenueData() {
  // State
  const [venue, setVenue] = useState(null);
  const [zones, setZones] = useState([]);
  const [queues, setQueues] = useState([]);
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [matchClock, setMatchClock] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  // Socket connection
  const { isConnected, connectionCount, on, emit } = useSocket();

  // ── Add Toast ──────────────────────────────────────────────
  const addToast = useCallback((toast) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { ...toast, id }]);
    // Auto-dismiss after 5s (critical alerts stay 8s)
    const duration = toast.severity === 'critical' ? 8000 : 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Initial Data Fetch ─────────────────────────────────────
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setIsLoading(true);
        const [venueRes, zonesRes, queuesRes, feedRes, statsRes] = await Promise.all([
          api.getVenue(),
          api.getZones(),
          api.getQueues(),
          api.getFeed(30),
          api.getStats(),
        ]);

        if (venueRes.success) setVenue(venueRes.data);
        if (zonesRes.success) setZones(zonesRes.data);
        if (queuesRes.success) setQueues(queuesRes.data);
        if (feedRes.success) setFeed(feedRes.data);
        if (statsRes.success) setStats(statsRes.data);
        
        setError(null);
      } catch (err) {
        setError('Failed to load venue data. Please check your connection.');
        addToast({ title: 'Connection Error', message: 'Failed to load venue data.', severity: 'error' });
        console.error('[VenueData] Initial fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInitialData();
  }, [addToast]);

  // ── Socket.IO Initial State ────────────────────────────────
  useEffect(() => {
    const unsub = on('init:state', (data) => {
      if (data.venue) setVenue(data.venue);
      if (data.zones) setZones(data.zones);
      if (data.queues) setQueues(data.queues);
      if (data.feed) setFeed(data.feed);
      if (data.stats) setStats(data.stats);
      setIsLoading(false);
    });
    return unsub;
  }, [on]);

  // ── Real-time Zone Updates ─────────────────────────────────
  useEffect(() => {
    const unsub = on('zone:update', (updatedZone) => {
      setZones((prev) =>
        prev.map((z) => (z.id === updatedZone.id ? { ...z, ...updatedZone } : z))
      );
    });
    return unsub;
  }, [on]);

  // ── Real-time Queue Updates ────────────────────────────────
  useEffect(() => {
    const unsub = on('queue:update', (updatedQueue) => {
      setQueues((prev) =>
        prev.map((q) => (q.id === updatedQueue.id ? { ...q, ...updatedQueue } : q))
      );
    });
    return unsub;
  }, [on]);

  // ── Real-time Feed Updates ─────────────────────────────────
  useEffect(() => {
    const unsub = on('feed:new', (newItem) => {
      setFeed((prev) => [newItem, ...prev].slice(0, 100));
    });
    return unsub;
  }, [on]);

  // ── Match Clock Updates ────────────────────────────────────
  useEffect(() => {
    const unsub = on('venue:clock', (clockData) => {
      setMatchClock(clockData);
      // Update venue status
      setVenue((prev) => prev ? { ...prev, status: clockData.status } : prev);
    });
    return unsub;
  }, [on]);

  // ── Alert Broadcasts → Toast Notifications ─────────────────
  useEffect(() => {
    const unsub = on('alert:broadcast', (alert) => {
      addToast({
        type: 'alert',
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp,
      });
    });
    return unsub;
  }, [on, addToast]);

  // ── Request refresh ────────────────────────────────────────
  const refresh = useCallback(() => {
    emit('request:refresh');
  }, [emit]);

  // ── Connection Status Toasts ───────────────────────────────
  const prevConnected = useRef(isConnected);
  useEffect(() => {
    if (isConnected && !prevConnected.current) {
      addToast({ title: 'Connected', message: 'Live connection established.', severity: 'success' });
    } else if (!isConnected && prevConnected.current) {
      addToast({ title: 'Disconnected', message: 'Lost connection to venue. Reconnecting...', severity: 'warning' });
    }
    prevConnected.current = isConnected;
  }, [isConnected, addToast]);

  return {
    // Data
    venue,
    zones,
    queues,
    feed,
    stats,
    matchClock,
    
    // Connection
    isConnected,
    connectionCount,
    
    // UI State
    isLoading,
    error,
    toasts,
    
    // Actions
    refresh,
    emit,
    dismissToast,
    addToast,
  };
}

export default useVenueData;
