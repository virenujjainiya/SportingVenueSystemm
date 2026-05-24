/*
 * Express Application Setup
 *
 * Configures all middleware, routes, and error handling.
 * Separated from server bootstrap for testability.
 *
 * ARCHITECTURE:
 *   Public GET  /api/*         — No auth (attendees browse freely)
 *   Protected POST /api/*      — JWT required (admin only)
 *   Auth        /api/auth/*    — Login, logout, me, refresh
 *   Health      /health        — No rate limit (for load balancer probes)
 */
require('express-async-errors'); // Patches async route errors → next(err) automatically

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const config = require('./config');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const performanceMiddleware = require('./middleware/performance');

// Route handlers
const authRoutes = require('./routes/auth');
const venueRoutes = require('./routes/venue');
const zoneRoutes = require('./routes/zones');
const queueRoutes = require('./routes/queues');
const feedRoutes = require('./routes/feed');

const app = express();

// ── Security Headers ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Allow inline scripts for Socket.IO client page
  contentSecurityPolicy: false,
}));

// ── Compression ───────────────────────────────────────────
app.use(compression({
  // Only compress responses > 1KB
  threshold: 1024,
  // Don't compress already-compressed data
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || origin === config.corsOrigin) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin "${origin}" not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Response-Time', 'X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400, // 24h preflight cache
}));

// ── Body Parser ───────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Performance + Logging ─────────────────────────────────
app.use(performanceMiddleware);
app.use(requestLogger);

// ── Trust proxy (for correct IP behind load balancer) ────
app.set('trust proxy', 1);

// ── Health Check — no rate limit (for ALB/Nginx probes) ──
const store = require('./data/store');
app.get('/health', (req, res) => {
  const stats = store.getStats();
  res.json({
    status: 'healthy',
    version: config.apiVersion,
    uptime: Math.round(process.uptime()),
    uptimeHuman: formatUptime(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    memory: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    data: {
      totalAttendance: stats.totalAttendance,
      openQueues: stats.openQueues,
    },
  });
});

// ── Rate Limiting ─────────────────────────────────────────
app.use('/api/', rateLimiter);

// ── API Routes (versioned) ────────────────────────────────
const apiBase = `/api/${config.apiVersion}`;

// Auth routes (no general rate limit — auth.js uses its own stricter limiter)
app.use(`${apiBase}/auth`, authRoutes);
app.use('/api/auth', authRoutes); // unversioned alias for convenience

// Data routes
app.use(`${apiBase}/venue`, venueRoutes);
app.use(`${apiBase}/zones`, zoneRoutes);
app.use(`${apiBase}/queues`, queueRoutes);
app.use(`${apiBase}/feed`, feedRoutes);

// Unversioned aliases (backwards compat)
app.use('/api/venue', venueRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/feed', feedRoutes);

// ── Stats Endpoint ────────────────────────────────────────
app.get(`${apiBase}/stats`, (req, res, next) => {
  try {
    res.json({ success: true, data: store.getStats() });
  } catch (err) { next(err); }
});
app.get('/api/stats', (req, res, next) => {
  try {
    res.json({ success: true, data: store.getStats() });
  } catch (err) { next(err); }
});

// ── API Version Info ──────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    name: 'VenueFlow API',
    version: config.apiVersion,
    status: 'operational',
    endpoints: {
      auth: `/api/${config.apiVersion}/auth`,
      venue: `/api/${config.apiVersion}/venue`,
      zones: `/api/${config.apiVersion}/zones`,
      queues: `/api/${config.apiVersion}/queues`,
      feed: `/api/${config.apiVersion}/feed`,
      stats: `/api/${config.apiVersion}/stats`,
    },
    docs: 'See INTEGRATION.md for full API contract',
  });
});

// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.path}`,
    hint: 'See GET /api for available endpoints',
  });
});

// ── Global Error Handler ──────────────────────────────────
app.use(errorHandler);

// ── Helpers ───────────────────────────────────────────────
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

module.exports = app;
