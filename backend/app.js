/*
 * Express Application Setup
 * 
 * Configures all middleware, routes, and error handling.
 * Separated from server bootstrap for testability.
 */
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const config = require('./config');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// Route handlers
const venueRoutes = require('./routes/venue');
const zoneRoutes = require('./routes/zones');
const queueRoutes = require('./routes/queues');
const feedRoutes = require('./routes/feed');

const app = express();

// ── Security & Performance Middleware ──────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// ── Rate Limiting ─────────────────────────────────────────
app.use('/api/', rateLimiter);

// ── Health Check (no rate limit) ──────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/venue', venueRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/feed', feedRoutes);

// ── Stats Endpoint ────────────────────────────────────────
const store = require('./data/store');
app.get('/api/stats', (req, res) => {
  res.json({ success: true, data: store.getStats() });
});

// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

// ── Global Error Handler ──────────────────────────────────
app.use(errorHandler);

module.exports = app;
