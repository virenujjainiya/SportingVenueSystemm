/*
 * Socket.IO Configuration & Event Handlers
 *
 * Handles real-time WebSocket connections.
 * 
 * SCALE NOTE: For 100M users, add:
 * - @socket.io/redis-adapter for multi-server fan-out
 * - @socket.io/redis-streams-adapter for sticky sessions
 * - Connection limiting per IP
 * - Room-based broadcasting (users join their zone room)
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
    // Performance: limit payload size
    maxHttpBufferSize: 1e6, // 1MB
    // Transport: prefer WebSocket, fallback to polling
    transports: ['websocket', 'polling'],
  });

  // Track connected clients
  let connectionCount = 0;

  io.on('connection', (socket) => {
    connectionCount++;
    console.log(`[SOCKET] Client connected (${socket.id}). Total: ${connectionCount}`);

    // Send initial state on connect
    socket.emit('init:state', {
      venue: store.getVenue(),
      zones: store.getAllZones(),
      queues: store.getAllQueues(),
      feed: store.getFeed(20),
      stats: store.getStats(),
      connectedClients: connectionCount,
    });

    // Client reports they entered a zone
    socket.on('zone:checkin', (data) => {
      if (data && data.zoneId) {
        // Join zone room for targeted updates
        socket.join(`zone:${data.zoneId}`);
        console.log(`[SOCKET] ${socket.id} checked into ${data.zoneId}`);
      }
    });

    // Client requests fresh data
    socket.on('request:refresh', () => {
      socket.emit('init:state', {
        venue: store.getVenue(),
        zones: store.getAllZones(),
        queues: store.getAllQueues(),
        feed: store.getFeed(20),
        stats: store.getStats(),
        connectedClients: connectionCount,
      });
    });

    // Admin: update score manually
    socket.on('admin:updateScore', (data) => {
      const venue = store._venue;
      if (data.home !== undefined) venue.match.homeTeam.score = data.home;
      if (data.away !== undefined) venue.match.awayTeam.score = data.away;

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
    });

    socket.on('disconnect', (reason) => {
      connectionCount--;
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
