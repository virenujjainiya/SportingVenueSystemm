/*
 * VenueFlow Backend — Entry Point
 *
 * Bootstraps the HTTP server, Socket.IO, and simulation engine.
 *
 * SCALE NOTE: For production at 100M users, this file would use
 * Node.js cluster module to fork workers per CPU core:
 *
 *   const cluster = require('cluster');
 *   const numCPUs = require('os').cpus().length;
 *   if (cluster.isPrimary) {
 *     for (let i = 0; i < numCPUs; i++) cluster.fork();
 *   } else {
 *     // start server
 *   }
 *
 * Combined with @socket.io/redis-adapter for WebSocket fan-out.
 */

const http = require('http');
const app = require('./app');
const { createSocketServer } = require('./socket');
const simulation = require('./simulation/engine');
const config = require('./config');

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
const io = createSocketServer(server);
app.set('io', io);

// Start simulation engine
simulation.start(io, config.simulation.intervalMs);

// Start listening
server.listen(config.port, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║         🏟️  VenueFlow Backend Server                ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Status:      RUNNING                               ║`);
  console.log(`║  Port:        ${String(config.port).padEnd(39)}║`);
  console.log(`║  Environment: ${String(config.nodeEnv).padEnd(39)}║`);
  console.log(`║  CORS Origin: ${String(config.corsOrigin).padEnd(39)}║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                         ║');
  console.log('║    GET  /health              Health check            ║');
  console.log('║    GET  /api/venue           Venue metadata          ║');
  console.log('║    GET  /api/zones           Zone densities          ║');
  console.log('║    GET  /api/queues          Queue wait times        ║');
  console.log('║    GET  /api/queues/recommend Smart recommendations  ║');
  console.log('║    GET  /api/feed            Live event feed         ║');
  console.log('║    GET  /api/stats           Dashboard stats         ║');
  console.log('║    POST /api/feed            Post announcement       ║');
  console.log('║    POST /api/queues/:id      Update queue            ║');
  console.log('║    POST /api/zones/:id       Update zone             ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  WebSocket Events:                                   ║');
  console.log('║    → zone:update, queue:update, feed:new            ║');
  console.log('║    → alert:broadcast, venue:clock                   ║');
  console.log('║    → init:state, stats:connections                  ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('[SIMULATION] Engine running — live data flowing');
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n[SERVER] ${signal} received. Shutting down gracefully...`);
  simulation.stop();
  io.close(() => {
    server.close(() => {
      console.log('[SERVER] All connections closed. Goodbye!');
      process.exit(0);
    });
  });
  // Force exit after 10s
  setTimeout(() => {
    console.log('[SERVER] Forcing exit after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});
