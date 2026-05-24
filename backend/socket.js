/*
 * Socket.IO Configuration & Event Handlers
 *
 * Handles real-time WebSocket connections.
 * 
 * FIXES APPLIED:
 * - try-catch on all event handlers (prevents uncaught exceptions crashing server)
 * - admin:updateScore: validates score is a non-negative integer
 * - zone:checkin: validates zoneId exists in store
 * - request:refresh: rate-limited to prevent spam
 * - connectionCount cannot go negative
 * - Error responses sent back to client via socket.emit('error:message')
 *
 * SCALE NOTE: For 100M users, add:
 * - @socket.io/redis-adapter for multi-server fan-out
 * - Connection limiting per IP
 */

const { Server } = require('socket.io');
const config = require('./config');
const store = require('./data/store');

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: config.socket.pingInterval,
    pingTimeout: config.socket.pingTimeout,
    maxHttpBufferSize: 1e6,
    transports: ['websocket', 'polling'],
  });

  // Track connected clients
  let connectionCount = 0;

  // Rate limit tracking for refresh requests
  const refreshCooldowns = new Map();
  const REFRESH_COOLDOWN_MS = 2000; // 2 seconds between refreshes

  io.on('connection', (socket) => {
    connectionCount++;
    console.log(`[SOCKET] Client connected (${socket.id}). Total: ${connectionCount}`);

    // Send initial state on connect
    try {
      socket.emit('init:state', {
        venue: store.getVenue(),
        zones: store.getAllZones(),
        queues: store.getAllQueues(),
        feed: store.getFeed(20),
        stats: store.getStats(),
        connectedClients: connectionCount,
      });
    } catch (err) {
      console.error(`[SOCKET] Error sending init:state to ${socket.id}:`, err.message);
      socket.emit('error:message', {
        code: 'INIT_FAILED',
        message: 'Failed to load initial data. Try refreshing.',
      });
    }

    // Client reports they entered a zone
    socket.on('zone:checkin', (data) => {
      try {
        if (!data || !data.zoneId || typeof data.zoneId !== 'string') {
          return socket.emit('error:message', {
            code: 'INVALID_INPUT',
            message: 'zoneId is required and must be a string.',
          });
        }

        // Validate zone exists
        const zone = store.getZone(data.zoneId);
        if (!zone) {
          return socket.emit('error:message', {
            code: 'ZONE_NOT_FOUND',
            message: `Zone "${data.zoneId}" does not exist.`,
          });
        }

        // Leave any previous zone rooms
        socket.rooms.forEach((room) => {
          if (room.startsWith('zone:') && room !== `zone:${data.zoneId}`) {
            socket.leave(room);
          }
        });

        socket.join(`zone:${data.zoneId}`);
        console.log(`[SOCKET] ${socket.id} checked into ${data.zoneId}`);
      } catch (err) {
        console.error(`[SOCKET] Error in zone:checkin for ${socket.id}:`, err.message);
      }
    });

    // Client requests fresh data (rate-limited)
    socket.on('request:refresh', () => {
      try {
        const now = Date.now();
        const lastRefresh = refreshCooldowns.get(socket.id) || 0;

        if (now - lastRefresh < REFRESH_COOLDOWN_MS) {
          return socket.emit('error:message', {
            code: 'RATE_LIMITED',
            message: 'Refresh too frequent. Please wait a moment.',
          });
        }

        refreshCooldowns.set(socket.id, now);

        socket.emit('init:state', {
          venue: store.getVenue(),
          zones: store.getAllZones(),
          queues: store.getAllQueues(),
          feed: store.getFeed(20),
          stats: store.getStats(),
          connectedClients: connectionCount,
        });
      } catch (err) {
        console.error(`[SOCKET] Error in request:refresh for ${socket.id}:`, err.message);
        socket.emit('error:message', {
          code: 'REFRESH_FAILED',
          message: 'Failed to refresh data. Try again.',
        });
      }
    });

    // Admin: update score manually
    socket.on('admin:updateScore', (data) => {
      try {
        if (!data || typeof data !== 'object') {
          return socket.emit('error:message', {
            code: 'INVALID_INPUT',
            message: 'Score data must be an object with home and/or away fields.',
          });
        }

        const venue = store._venue;

        // Validate home score
        if (data.home !== undefined) {
          const home = Number(data.home);
          if (!Number.isFinite(home) || home < 0 || home > 99 || home !== Math.floor(home)) {
            return socket.emit('error:message', {
              code: 'INVALID_SCORE',
              message: 'home score must be a non-negative integer (0-99).',
            });
          }
          venue.match.homeTeam.score = home;
        }

        // Validate away score
        if (data.away !== undefined) {
          const away = Number(data.away);
          if (!Number.isFinite(away) || away < 0 || away > 99 || away !== Math.floor(away)) {
            return socket.emit('error:message', {
              code: 'INVALID_SCORE',
              message: 'away score must be a non-negative integer (0-99).',
            });
          }
          venue.match.awayTeam.score = away;
        }

        const feedItem = store.addFeedItem({
          type: 'score',
          title: '📊 Score Update',
          message: `${venue.match.homeTeam.name} ${venue.match.homeTeam.score} - ${venue.match.awayTeam.score} ${venue.match.awayTeam.name}`,
          severity: 'info',
        });

        io.emit('feed:new', feedItem);
        io.emit('venue:clock', {
          clock: venue.match.clock,
          half: venue.match.half,
          status: venue.status,
          score: {
            home: { name: venue.match.homeTeam.shortName, score: venue.match.homeTeam.score },
            away: { name: venue.match.awayTeam.shortName, score: venue.match.awayTeam.score },
          },
        });

        console.log(`[SOCKET] Score updated by ${socket.id}: ${venue.match.homeTeam.score}-${venue.match.awayTeam.score}`);
      } catch (err) {
        console.error(`[SOCKET] Error in admin:updateScore for ${socket.id}:`, err.message);
        socket.emit('error:message', {
          code: 'UPDATE_FAILED',
          message: 'Failed to update score. Please try again.',
        });
      }
    });

    socket.on('disconnect', (reason) => {
      // Ensure connectionCount never goes negative
      connectionCount = Math.max(0, connectionCount - 1);
      // Clean up rate limit tracking
      refreshCooldowns.delete(socket.id);
      console.log(`[SOCKET] Client disconnected (${socket.id}): ${reason}. Total: ${connectionCount}`);
    });

    socket.on('error', (err) => {
      console.error(`[SOCKET] Error on ${socket.id}:`, err.message);
    });
  });

  // Broadcast connection count every 10 seconds
  setInterval(() => {
    io.emit('stats:connections', { connectedClients: connectionCount });
  }, 10000);

  return io;
}

module.exports = { createSocketServer };
