/*
 * useSocket Hook
 * 
 * Manages Socket.IO connection lifecycle.
 * - Auto-connects on mount
 * - Auto-reconnects on disconnect
 * - Provides event subscription helper
 * - Cleans up on unmount
 * 
 * Usage:
 *   const { socket, isConnected, on, emit } = useSocket();
 *   
 *   useEffect(() => {
 *     const unsub = on('zone:update', (data) => { ... });
 *     return unsub;
 *   }, [on]);
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setIsConnected(false);
    });

    socket.on('stats:connections', (data) => {
      setConnectionCount(data.connectedClients);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Subscribe to an event — returns unsubscribe function
  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  // Emit an event
  const emit = useCallback((event, data) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionCount,
    on,
    emit,
  };
}

export default useSocket;
