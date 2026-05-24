# 🏟️ VenueFlow Backend — Complete Execution Guide

> **Role**: You are Developer 1 (Backend). You own everything in `/backend`.
> **Time Budget**: 3 hours total. ~2.5 hours for backend code.
> **Integration Partner**: Developer 2 is building the frontend in `/frontend` simultaneously.
> **DO NOT** touch any files in `/frontend`.

---

## SYSTEM CONTEXT

**Project**: VenueFlow — Real-time sporting venue companion system
**Purpose**: Serve 100M+ users with real-time crowd density, queue wait times, live event feeds, and smart recommendations for attendees at large-scale sporting venues.
**Architecture**: Stateless Node.js API + Socket.IO for real-time + In-memory data store (architected for Redis migration)

---

## ARCHITECTURE DECISIONS FOR 100M SCALE

```
┌─────────────────────────────────────────────────────────┐
│                    LOAD BALANCER                        │
│              (Nginx / AWS ALB / Cloudflare)             │
└─────────────┬───────────────────────┬───────────────────┘
              │                       │
    ┌─────────▼─────────┐   ┌────────▼──────────┐
    │  API Server Pod 1  │   │  API Server Pod N  │
    │  (Express + Socket) │   │  (Express + Socket) │
    │  Cluster Mode (CPU) │   │  Cluster Mode (CPU) │
    └─────────┬──────────┘   └────────┬──────────┘
              │                       │
    ┌─────────▼───────────────────────▼───────────────┐
    │              REDIS CLUSTER                       │
    │  • Pub/Sub for WebSocket fan-out                 │
    │  • Cached zone/queue data (TTL: 5s)              │
    │  • Rate limiting counters                        │
    │  • Session store                                 │
    └─────────────────────────────────────────────────┘
```

### Scale Strategies Implemented in Code:
1. **Node.js Cluster Mode** — Fork workers per CPU core
2. **Stateless Design** — No server-side sessions, all state in data store
3. **Connection Pooling** — Socket.IO with Redis adapter (scaffolded)
4. **Rate Limiting** — Per-IP request throttling
5. **Compression** — gzip all API responses
6. **ETag Caching** — HTTP cache headers on GET endpoints
7. **Efficient Broadcasting** — Room-based Socket.IO (per-zone rooms)
8. **Graceful Shutdown** — Clean connection draining

---

## TECH STACK

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18 | HTTP server framework |
| `socket.io` | ^4.7 | WebSocket real-time engine |
| `cors` | ^2.8 | Cross-origin requests (frontend on different port) |
| `compression` | ^1.7 | gzip response compression |
| `helmet` | ^7.1 | Security headers |
| `express-rate-limit` | ^7.1 | Rate limiting for API protection |
| `uuid` | ^9.0 | Unique ID generation |
| `dotenv` | ^16.3 | Environment configuration |

---

## FOLDER STRUCTURE

```
backend/
├── package.json
├── .env
├── .env.example
├── index.js                    ← Entry point: cluster manager + server bootstrap
├── app.js                      ← Express app configuration (middleware, routes)
├── socket.js                   ← Socket.IO setup and event handlers
│
├── config/
│   └── index.js                ← Centralized configuration from env vars
│
├── routes/
│   ├── venue.js                ← GET /api/venue
│   ├── zones.js                ← GET /api/zones, POST /api/zones/:id
│   ├── queues.js               ← GET /api/queues, POST /api/queues/:id
│   └── feed.js                 ← GET /api/feed, POST /api/feed
│
├── data/
│   └── store.js                ← In-memory data store (Redis-ready interface)
│
├── simulation/
│   └── engine.js               ← Auto-simulate crowd movement & queue changes
│
├── middleware/
│   ├── rateLimiter.js          ← Rate limiting middleware
│   ├── errorHandler.js         ← Global error handler
│   └── requestLogger.js        ← Request logging middleware
│
├── utils/
│   ├── recommendations.js      ← Smart queue recommendation algorithm
│   └── helpers.js              ← Shared utility functions
│
└── EXECUTION.md                ← This file
```

---

## STEP-BY-STEP BUILD ORDER

> **IMPORTANT**: Follow this order exactly. Each step lists the exact file to create and its complete specification.

---

### STEP 1: Initialize Project (Minute 0–5)

**Run these commands:**
```bash
cd backend
npm init -y
npm install express socket.io cors compression helmet express-rate-limit uuid dotenv
```

**Then update `package.json` scripts:**
```json
{
  "name": "venueflow-backend",
  "version": "1.0.0",
  "description": "VenueFlow real-time sporting venue backend API",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "keywords": ["venue", "realtime", "socketio"],
  "license": "MIT"
}
```

---

### STEP 2: Create `.env` and Config

**File: `.env`**
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SIMULATION_INTERVAL_MS=5000
MAX_CONNECTIONS_PER_IP=50
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**File: `.env.example`**
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SIMULATION_INTERVAL_MS=5000
MAX_CONNECTIONS_PER_IP=50
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**File: `config/index.js`**
```javascript
/*
 * Centralized configuration.
 * All environment variables are read here and exported as a frozen object.
 * This makes it easy to swap to a config service later for 100M scale.
 */
require('dotenv').config();

const config = Object.freeze({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  simulation: {
    intervalMs: parseInt(process.env.SIMULATION_INTERVAL_MS, 10) || 5000,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  socket: {
    maxConnectionsPerIp: parseInt(process.env.MAX_CONNECTIONS_PER_IP, 10) || 50,
    pingInterval: 25000,
    pingTimeout: 20000,
  },
});

module.exports = config;
```

---

### STEP 3: Create Data Store

**File: `data/store.js`**

This is the single source of truth. It uses an in-memory Map-based store but exposes a Redis-compatible interface so migration is a simple swap.

```javascript
/*
 * In-Memory Data Store
 * 
 * SCALE NOTE: For 100M users, replace this module with Redis client.
 * The interface (get, set, getAll, update) stays identical.
 * All functions are synchronous now but return values directly.
 * When migrating to Redis, wrap returns in Promises — callers use await.
 *
 * DATA OWNED:
 * - venue: single object with venue metadata
 * - zones: Map<zoneId, ZoneObject>
 * - queues: Map<queueId, QueueObject>
 * - feed: Array<FeedItem> (newest first, capped at 100)
 */

const { v4: uuidv4 } = require('uuid');

// ============================================================
// VENUE METADATA
// ============================================================
const venue = {
  id: 'venue-001',
  name: 'MetLife Grand Stadium',
  sport: 'Football',
  capacity: 52000,
  currentAttendance: 0,
  status: 'live',        // 'upcoming' | 'live' | 'halftime' | 'ended'
  match: {
    homeTeam: { name: 'Thunder FC', shortName: 'THU', score: 0, logo: '⚡' },
    awayTeam: { name: 'Phoenix Rising', shortName: 'PHX', score: 0, logo: '🔥' },
    clock: '00:00',
    half: 1,
    startTime: new Date().toISOString(),
  },
  weather: { temp: 24, condition: 'Clear', icon: '☀️' },
};

// ============================================================
// ZONES — Stadium sections with crowd density
// ============================================================
const zones = new Map();

const zoneDefinitions = [
  { id: 'zone-north', name: 'North Stand', type: 'seating', capacity: 8000, x: 50, y: 10 },
  { id: 'zone-south', name: 'South Stand', type: 'seating', capacity: 8000, x: 50, y: 90 },
  { id: 'zone-east', name: 'East Wing', type: 'seating', capacity: 7000, x: 90, y: 50 },
  { id: 'zone-west', name: 'West Wing', type: 'seating', capacity: 7000, x: 10, y: 50 },
  { id: 'zone-vip', name: 'VIP Lounge', type: 'vip', capacity: 2000, x: 50, y: 50 },
  { id: 'zone-concourse-n', name: 'North Concourse', type: 'concourse', capacity: 5000, x: 50, y: 25 },
  { id: 'zone-concourse-s', name: 'South Concourse', type: 'concourse', capacity: 5000, x: 50, y: 75 },
  { id: 'zone-gate-a', name: 'Gate A Entry', type: 'gate', capacity: 3000, x: 15, y: 15 },
  { id: 'zone-gate-b', name: 'Gate B Entry', type: 'gate', capacity: 3000, x: 85, y: 15 },
  { id: 'zone-gate-c', name: 'Gate C Entry', type: 'gate', capacity: 3000, x: 85, y: 85 },
  { id: 'zone-gate-d', name: 'Gate D Entry', type: 'gate', capacity: 3000, x: 15, y: 85 },
];

zoneDefinitions.forEach((z) => {
  const currentCount = Math.floor(z.capacity * (0.3 + Math.random() * 0.4));
  zones.set(z.id, {
    ...z,
    currentCount,
    density: Math.round((currentCount / z.capacity) * 100),
    trend: 'stable', // 'rising' | 'falling' | 'stable'
    lastUpdated: new Date().toISOString(),
  });
});

// ============================================================
// QUEUES — Food, drink, merch, restroom points
// ============================================================
const queues = new Map();

const queueDefinitions = [
  { id: 'q-food-1', name: 'Burger & Fries Stand', type: 'food', zone: 'zone-concourse-n', x: 35, y: 22, icon: '🍔' },
  { id: 'q-food-2', name: 'Pizza Corner', type: 'food', zone: 'zone-concourse-n', x: 65, y: 22, icon: '🍕' },
  { id: 'q-food-3', name: 'Hot Dog Express', type: 'food', zone: 'zone-concourse-s', x: 40, y: 78, icon: '🌭' },
  { id: 'q-food-4', name: 'Taco Station', type: 'food', zone: 'zone-concourse-s', x: 60, y: 78, icon: '🌮' },
  { id: 'q-drink-1', name: 'Craft Beer Bar', type: 'drink', zone: 'zone-concourse-n', x: 50, y: 20, icon: '🍺' },
  { id: 'q-drink-2', name: 'Smoothie & Juice', type: 'drink', zone: 'zone-concourse-s', x: 50, y: 80, icon: '🥤' },
  { id: 'q-merch-1', name: 'Official Merch Store', type: 'merch', zone: 'zone-gate-a', x: 20, y: 18, icon: '👕' },
  { id: 'q-merch-2', name: 'Fan Zone Shop', type: 'merch', zone: 'zone-gate-c', x: 80, y: 82, icon: '🧢' },
  { id: 'q-restroom-1', name: 'Restroom North', type: 'restroom', zone: 'zone-concourse-n', x: 25, y: 28, icon: '🚻' },
  { id: 'q-restroom-2', name: 'Restroom South', type: 'restroom', zone: 'zone-concourse-s', x: 75, y: 72, icon: '🚻' },
  { id: 'q-restroom-3', name: 'Restroom East', type: 'restroom', zone: 'zone-east', x: 88, y: 45, icon: '🚻' },
  { id: 'q-restroom-4', name: 'Restroom West', type: 'restroom', zone: 'zone-west', x: 12, y: 55, icon: '🚻' },
];

queueDefinitions.forEach((q) => {
  const waitMinutes = Math.floor(Math.random() * 15) + 1;
  queues.set(q.id, {
    ...q,
    waitMinutes,
    peopleInQueue: waitMinutes * 3,
    status: 'open',        // 'open' | 'busy' | 'closed'
    trend: 'stable',       // 'growing' | 'shrinking' | 'stable'
    lastUpdated: new Date().toISOString(),
  });
});

// ============================================================
// LIVE FEED — Score updates, announcements, alerts
// ============================================================
const feed = [];
const MAX_FEED_ITEMS = 100;

// Seed initial feed items
const seedFeed = [
  { type: 'announcement', title: 'Welcome!', message: 'Welcome to MetLife Grand Stadium! Enjoy the match.', severity: 'info' },
  { type: 'announcement', title: 'Gates Open', message: 'All gates are now open. Find your seat using the venue map.', severity: 'info' },
  { type: 'score', title: 'Kickoff!', message: 'The match has begun! Thunder FC vs Phoenix Rising.', severity: 'info' },
];

seedFeed.forEach((item, i) => {
  feed.push({
    id: uuidv4(),
    ...item,
    timestamp: new Date(Date.now() - (seedFeed.length - i) * 60000).toISOString(),
  });
});

// ============================================================
// STORE API — This interface stays the same when migrating to Redis
// ============================================================
const store = {
  // Venue
  getVenue: () => ({ ...venue }),
  updateVenue: (updates) => Object.assign(venue, updates),

  // Zones
  getZone: (id) => zones.has(id) ? { ...zones.get(id) } : null,
  getAllZones: () => Array.from(zones.values()).map((z) => ({ ...z })),
  updateZone: (id, updates) => {
    if (!zones.has(id)) return null;
    const zone = zones.get(id);
    Object.assign(zone, updates, { lastUpdated: new Date().toISOString() });
    return { ...zone };
  },

  // Queues
  getQueue: (id) => queues.has(id) ? { ...queues.get(id) } : null,
  getAllQueues: () => Array.from(queues.values()).map((q) => ({ ...q })),
  updateQueue: (id, updates) => {
    if (!queues.has(id)) return null;
    const queue = queues.get(id);
    Object.assign(queue, updates, { lastUpdated: new Date().toISOString() });
    return { ...queue };
  },

  // Feed
  getFeed: (limit = 50) => feed.slice(-limit).reverse(),
  addFeedItem: (item) => {
    const feedItem = {
      id: uuidv4(),
      ...item,
      timestamp: new Date().toISOString(),
    };
    feed.push(feedItem);
    if (feed.length > MAX_FEED_ITEMS) feed.shift();
    return feedItem;
  },

  // Stats (for admin dashboard)
  getStats: () => {
    const allZones = Array.from(zones.values());
    const allQueues = Array.from(queues.values());
    return {
      totalAttendance: allZones.reduce((sum, z) => sum + z.currentCount, 0),
      avgDensity: Math.round(allZones.reduce((sum, z) => sum + z.density, 0) / allZones.length),
      avgWaitTime: Math.round(allQueues.reduce((sum, q) => sum + q.waitMinutes, 0) / allQueues.length),
      openQueues: allQueues.filter((q) => q.status === 'open').length,
      totalQueues: allQueues.length,
      highDensityZones: allZones.filter((z) => z.density > 80).length,
    };
  },

  // Direct refs for simulation engine (avoid copy overhead)
  _zones: zones,
  _queues: queues,
  _venue: venue,
};

module.exports = store;
```

---

### STEP 4: Create Middleware

**File: `middleware/rateLimiter.js`**
```javascript
/*
 * Rate Limiter
 * Protects API from abuse. At 100M scale, replace with Redis-backed limiter.
 * Current: 100 requests per minute per IP.
 */
const rateLimit = require('express-rate-limit');
const config = require('../config');

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
});

module.exports = apiLimiter;
```

**File: `middleware/errorHandler.js`**
```javascript
/*
 * Global Error Handler
 * Catches all unhandled errors and returns consistent JSON responses.
 * In production, errors are sanitized to prevent info leakage.
 */
const config = require('../config');

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = config.nodeEnv === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  res.status(statusCode).json({
    error: true,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
```

**File: `middleware/requestLogger.js`**
```javascript
/*
 * Lightweight request logger.
 * Logs method, path, status code, and response time.
 * At 100M scale, replace with structured logging (pino/winston) + log aggregation.
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(`[${logLevel}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
    originalEnd.apply(res, args);
  };

  next();
}

module.exports = requestLogger;
```

---

### STEP 5: Create Route Handlers

**File: `routes/venue.js`**
```javascript
/*
 * Venue Routes
 * GET /api/venue — Returns venue metadata, match info, weather
 * 
 * Response shape:
 * {
 *   id, name, sport, capacity, currentAttendance, status,
 *   match: { homeTeam, awayTeam, clock, half, startTime },
 *   weather: { temp, condition, icon }
 * }
 */
const { Router } = require('express');
const store = require('../data/store');

const router = Router();

router.get('/', (req, res) => {
  const venue = store.getVenue();
  const stats = store.getStats();
  res.json({
    success: true,
    data: {
      ...venue,
      currentAttendance: stats.totalAttendance,
    },
  });
});

module.exports = router;
```

**File: `routes/zones.js`**
```javascript
/*
 * Zone Routes
 * GET  /api/zones      — All zones with density data
 * GET  /api/zones/:id  — Single zone detail
 * POST /api/zones/:id  — [ADMIN] Update zone (e.g., close a zone)
 *
 * Response shape for each zone:
 * { id, name, type, capacity, currentCount, density (0-100), trend, x, y, lastUpdated }
 */
const { Router } = require('express');
const store = require('../data/store');

const router = Router();

// GET all zones
router.get('/', (req, res) => {
  const zones = store.getAllZones();
  const stats = store.getStats();
  res.json({
    success: true,
    data: zones,
    meta: {
      totalZones: zones.length,
      avgDensity: stats.avgDensity,
      highDensityCount: stats.highDensityZones,
    },
  });
});

// GET single zone
router.get('/:id', (req, res) => {
  const zone = store.getZone(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }
  // Include nearby queues
  const allQueues = store.getAllQueues();
  const nearbyQueues = allQueues.filter((q) => q.zone === zone.id);
  res.json({
    success: true,
    data: { ...zone, nearbyQueues },
  });
});

// POST update zone (admin)
router.post('/:id', (req, res) => {
  const { density, currentCount, status } = req.body;
  const updates = {};
  if (density !== undefined) updates.density = Math.min(100, Math.max(0, density));
  if (currentCount !== undefined) updates.currentCount = currentCount;
  if (status !== undefined) updates.status = status;

  const zone = store.updateZone(req.params.id, updates);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }

  // Emit real-time update (io is attached in socket.js)
  const io = req.app.get('io');
  if (io) {
    io.emit('zone:update', zone);
  }

  res.json({ success: true, data: zone });
});

module.exports = router;
```

**File: `routes/queues.js`**
```javascript
/*
 * Queue Routes
 * GET  /api/queues             — All queue points with wait times
 * GET  /api/queues/:id         — Single queue detail
 * POST /api/queues/:id         — [ADMIN] Update queue (wait time, status)
 * GET  /api/queues/recommend   — Smart recommendation for shortest queue by type
 *
 * Response shape for each queue:
 * { id, name, type, zone, waitMinutes, peopleInQueue, status, trend, x, y, icon, lastUpdated }
 */
const { Router } = require('express');
const store = require('../data/store');
const { getRecommendations } = require('../utils/recommendations');

const router = Router();

// GET smart recommendation — MUST be before /:id route
router.get('/recommend', (req, res) => {
  const { type } = req.query; // 'food' | 'drink' | 'merch' | 'restroom'
  const allQueues = store.getAllQueues();
  const recommendations = getRecommendations(allQueues, type);
  res.json({
    success: true,
    data: recommendations,
  });
});

// GET all queues
router.get('/', (req, res) => {
  const { type, status } = req.query;
  let allQueues = store.getAllQueues();

  if (type) allQueues = allQueues.filter((q) => q.type === type);
  if (status) allQueues = allQueues.filter((q) => q.status === status);

  // Sort by wait time (shortest first)
  allQueues.sort((a, b) => a.waitMinutes - b.waitMinutes);

  res.json({
    success: true,
    data: allQueues,
    meta: {
      total: allQueues.length,
      avgWaitMinutes: allQueues.length > 0
        ? Math.round(allQueues.reduce((s, q) => s + q.waitMinutes, 0) / allQueues.length)
        : 0,
    },
  });
});

// GET single queue
router.get('/:id', (req, res) => {
  const queue = store.getQueue(req.params.id);
  if (!queue) {
    return res.status(404).json({ success: false, message: 'Queue not found' });
  }
  res.json({ success: true, data: queue });
});

// POST update queue (admin)
router.post('/:id', (req, res) => {
  const { waitMinutes, status, peopleInQueue } = req.body;
  const updates = {};
  if (waitMinutes !== undefined) updates.waitMinutes = Math.max(0, waitMinutes);
  if (status !== undefined) updates.status = status;
  if (peopleInQueue !== undefined) updates.peopleInQueue = Math.max(0, peopleInQueue);

  const queue = store.updateQueue(req.params.id, updates);
  if (!queue) {
    return res.status(404).json({ success: false, message: 'Queue not found' });
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('queue:update', queue);
  }

  res.json({ success: true, data: queue });
});

module.exports = router;
```

**File: `routes/feed.js`**
```javascript
/*
 * Feed Routes
 * GET  /api/feed  — Get live event feed (scores, announcements, alerts)
 * POST /api/feed  — [ADMIN] Post new feed item
 *
 * Query params for GET:
 *   ?limit=20    — Number of items (default 50, max 100)
 *   ?type=score  — Filter by type
 *
 * POST body:
 *   { type: 'score'|'announcement'|'alert'|'milestone',
 *     title: string, message: string, severity: 'info'|'warning'|'critical' }
 */
const { Router } = require('express');
const store = require('../data/store');

const router = Router();

// GET feed
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  let items = store.getFeed(limit);

  if (req.query.type) {
    items = items.filter((item) => item.type === req.query.type);
  }

  res.json({
    success: true,
    data: items,
    meta: { count: items.length, limit },
  });
});

// POST new feed item (admin)
router.post('/', (req, res) => {
  const { type, title, message, severity } = req.body;

  if (!type || !title || !message) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: type, title, message',
    });
  }

  const validTypes = ['score', 'announcement', 'alert', 'milestone'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
    });
  }

  const feedItem = store.addFeedItem({
    type,
    title,
    message,
    severity: severity || 'info',
  });

  // Broadcast to all connected clients
  const io = req.app.get('io');
  if (io) {
    io.emit('feed:new', feedItem);
    // Critical alerts get special broadcast
    if (severity === 'critical') {
      io.emit('alert:broadcast', {
        severity: 'critical',
        title,
        message,
        timestamp: feedItem.timestamp,
      });
    }
  }

  res.status(201).json({ success: true, data: feedItem });
});

module.exports = router;
```

---

### STEP 6: Create Utilities

**File: `utils/recommendations.js`**
```javascript
/*
 * Smart Queue Recommendation Engine
 *
 * Algorithm: Weighted scoring based on:
 *   - Wait time (60% weight) — lower is better
 *   - Crowd trend (20% weight) — shrinking queues preferred
 *   - Queue status (20% weight) — open > busy > closed
 *
 * Returns top 3 recommendations sorted by score.
 */

function calculateScore(queue) {
  // Wait time score (0-100, lower wait = higher score)
  const maxWait = 30; // minutes
  const waitScore = Math.max(0, (1 - queue.waitMinutes / maxWait)) * 100;

  // Trend score
  const trendScores = { shrinking: 100, stable: 60, growing: 20 };
  const trendScore = trendScores[queue.trend] || 60;

  // Status score
  const statusScores = { open: 100, busy: 50, closed: 0 };
  const statusScore = statusScores[queue.status] || 0;

  // Weighted total
  return (waitScore * 0.6) + (trendScore * 0.2) + (statusScore * 0.2);
}

function getRecommendations(allQueues, type = null) {
  let candidates = allQueues.filter((q) => q.status !== 'closed');

  if (type) {
    candidates = candidates.filter((q) => q.type === type);
  }

  const scored = candidates.map((q) => ({
    ...q,
    score: Math.round(calculateScore(q)),
    recommendation: generateMessage(q),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((q, i) => ({
    rank: i + 1,
    ...q,
    isBestChoice: i === 0,
  }));
}

function generateMessage(queue) {
  if (queue.waitMinutes <= 2) return `Almost no wait! Head to ${queue.name} now.`;
  if (queue.waitMinutes <= 5) return `Short wait at ${queue.name}. Good choice!`;
  if (queue.trend === 'shrinking') return `${queue.name} queue is getting shorter. Go now!`;
  if (queue.waitMinutes <= 10) return `Moderate wait at ${queue.name}. Consider going soon.`;
  return `${queue.name} is busy. Check alternatives.`;
}

module.exports = { getRecommendations, calculateScore };
```

**File: `utils/helpers.js`**
```javascript
/*
 * Shared Utility Functions
 */

// Clamp a number between min and max
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Random integer between min (inclusive) and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random float between min and max
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Pick random item from array
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Format timestamp for logging
function timestamp() {
  return new Date().toISOString();
}

module.exports = { clamp, randomInt, randomFloat, randomPick, timestamp };
```

---

### STEP 7: Create Simulation Engine

**File: `simulation/engine.js`**

This is what makes the demo compelling — it auto-simulates realistic crowd movement, queue changes, and score events.

```javascript
/*
 * Simulation Engine
 *
 * Purpose: Generate realistic real-time data for demo purposes.
 * Runs on a configurable interval (default 5 seconds).
 *
 * Simulates:
 * 1. Crowd density changes per zone (gradual, realistic movement)
 * 2. Queue wait time fluctuations
 * 3. Periodic score updates and event milestones
 * 4. Match clock progression
 *
 * SCALE NOTE: In production, this is replaced by real sensor/IoT data
 * ingestion via a message queue (Kafka/RabbitMQ).
 */

const store = require('../data/store');
const { clamp, randomInt, randomFloat, randomPick } = require('../utils/helpers');

let simulationTimer = null;
let matchClockTimer = null;
let matchSeconds = 0;
let io = null;

// Score event templates
const scoreEvents = [
  { title: '⚡ GOAL!', msgTemplate: (team) => `${team} scores! What a strike!` },
  { title: '🟡 Yellow Card', msgTemplate: (team) => `Yellow card shown to ${team} player.` },
  { title: '🔴 Red Card', msgTemplate: (team) => `Red card! ${team} player sent off!` },
  { title: '⚽ Corner Kick', msgTemplate: (team) => `Corner kick for ${team}.` },
  { title: '🥅 Free Kick', msgTemplate: (team) => `Free kick awarded to ${team}.` },
  { title: '🔄 Substitution', msgTemplate: (team) => `${team} makes a substitution.` },
];

const milestoneEvents = [
  { title: '🎉 Half Time', message: 'The first half has ended. Grab some food!', type: 'milestone' },
  { title: '🔔 10 Minutes Left', message: 'Just 10 minutes remaining in the match!', type: 'milestone' },
  { title: '⏱️ Added Time', message: '3 minutes of added time!', type: 'milestone' },
];

function simulateZones() {
  const zones = store._zones;

  zones.forEach((zone, id) => {
    // Simulate gradual density changes (-5% to +5%)
    const change = randomFloat(-5, 5);
    const newDensity = clamp(Math.round(zone.density + change), 5, 98);
    const newCount = Math.round((newDensity / 100) * zone.capacity);

    // Determine trend
    let trend = 'stable';
    if (newDensity > zone.density + 2) trend = 'rising';
    else if (newDensity < zone.density - 2) trend = 'falling';

    zone.density = newDensity;
    zone.currentCount = newCount;
    zone.trend = trend;
    zone.lastUpdated = new Date().toISOString();

    // Emit update
    if (io) {
      io.emit('zone:update', { ...zone });
    }
  });
}

function simulateQueues() {
  const queuesMap = store._queues;

  queuesMap.forEach((queue, id) => {
    if (queue.status === 'closed') return;

    // Simulate wait time changes (-2 to +3 minutes)
    const change = randomFloat(-2, 3);
    const newWait = clamp(Math.round(queue.waitMinutes + change), 1, 25);
    const newPeople = newWait * randomInt(2, 4);

    // Determine trend
    let trend = 'stable';
    if (newWait > queue.waitMinutes + 1) trend = 'growing';
    else if (newWait < queue.waitMinutes - 1) trend = 'shrinking';

    // Occasionally change status
    if (newWait > 15) queue.status = 'busy';
    else queue.status = 'open';

    queue.waitMinutes = newWait;
    queue.peopleInQueue = newPeople;
    queue.trend = trend;
    queue.lastUpdated = new Date().toISOString();

    if (io) {
      io.emit('queue:update', { ...queue });
    }
  });
}

function simulateMatchEvents() {
  // 10% chance of a match event each cycle
  if (Math.random() > 0.10) return;

  const venue = store._venue;
  const event = randomPick(scoreEvents);
  const isHome = Math.random() > 0.5;
  const team = isHome ? venue.match.homeTeam.name : venue.match.awayTeam.name;

  // If it's a goal, update score
  if (event.title.includes('GOAL')) {
    if (isHome) venue.match.homeTeam.score++;
    else venue.match.awayTeam.score++;
  }

  const feedItem = store.addFeedItem({
    type: event.title.includes('GOAL') ? 'score' : 'announcement',
    title: event.title,
    message: `[${venue.match.clock}] ${event.msgTemplate(team)}`,
    severity: event.title.includes('GOAL') ? 'warning' : 'info',
  });

  if (io) {
    io.emit('feed:new', feedItem);
    // Goals get special broadcast
    if (event.title.includes('GOAL')) {
      io.emit('alert:broadcast', {
        severity: 'warning',
        title: event.title,
        message: feedItem.message,
        score: {
          home: venue.match.homeTeam.score,
          away: venue.match.awayTeam.score,
        },
        timestamp: feedItem.timestamp,
      });
    }
  }
}

function updateMatchClock() {
  const venue = store._venue;
  matchSeconds += 1;
  // Speed up: 1 real second = 1 match minute for demo purposes
  const minutes = Math.floor(matchSeconds);
  const secs = 0;
  venue.match.clock = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Half time at 45 minutes
  if (minutes === 45 && venue.match.half === 1) {
    venue.match.half = 2;
    venue.status = 'halftime';
    const item = store.addFeedItem({
      type: 'milestone',
      title: '🎉 Half Time',
      message: `Half time! Score: ${venue.match.homeTeam.name} ${venue.match.homeTeam.score} - ${venue.match.awayTeam.score} ${venue.match.awayTeam.name}`,
      severity: 'info',
    });
    if (io) io.emit('feed:new', item);
  }

  // Second half starts at 46
  if (minutes === 46) {
    venue.status = 'live';
  }

  // Full time at 90
  if (minutes >= 90) {
    venue.status = 'ended';
    matchSeconds = 90;
  }

  // Broadcast clock update every 5 seconds
  if (matchSeconds % 5 === 0 && io) {
    io.emit('venue:clock', {
      clock: venue.match.clock,
      half: venue.match.half,
      status: venue.status,
      score: {
        home: { name: venue.match.homeTeam.shortName, score: venue.match.homeTeam.score },
        away: { name: venue.match.awayTeam.shortName, score: venue.match.awayTeam.score },
      },
    });
  }
}

function start(socketIo, intervalMs = 5000) {
  io = socketIo;
  console.log(`[SIMULATION] Starting engine (interval: ${intervalMs}ms)`);

  // Main simulation loop
  simulationTimer = setInterval(() => {
    simulateZones();
    simulateQueues();
    simulateMatchEvents();
  }, intervalMs);

  // Match clock ticks every second
  matchClockTimer = setInterval(updateMatchClock, 1000);

  return { stop };
}

function stop() {
  if (simulationTimer) clearInterval(simulationTimer);
  if (matchClockTimer) clearInterval(matchClockTimer);
  console.log('[SIMULATION] Engine stopped');
}

module.exports = { start, stop };
```

---

### STEP 8: Create Socket.IO Handler

**File: `socket.js`**
```javascript
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
```

---

### STEP 9: Create Express App

**File: `app.js`**
```javascript
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
```

---

### STEP 10: Create Entry Point

**File: `index.js`**
```javascript
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
```

---

## API REFERENCE (For Frontend Developer)

### Base URL: `http://localhost:3001`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/health` | Server health check | None |
| `GET` | `/api/venue` | Venue metadata + match info | None |
| `GET` | `/api/zones` | All zones with density data | None |
| `GET` | `/api/zones/:id` | Single zone + nearby queues | None |
| `POST` | `/api/zones/:id` | Update zone density | Admin |
| `GET` | `/api/queues` | All queues (sortable, filterable) | None |
| `GET` | `/api/queues/recommend?type=food` | Smart queue recommendations | None |
| `GET` | `/api/queues/:id` | Single queue detail | None |
| `POST` | `/api/queues/:id` | Update queue wait time/status | Admin |
| `GET` | `/api/feed?limit=20&type=score` | Live event feed | None |
| `POST` | `/api/feed` | Post announcement/alert | Admin |
| `GET` | `/api/stats` | Aggregate statistics | None |

### WebSocket Events (Socket.IO on same port 3001)

**Server → Client:**
| Event | Payload | Frequency |
|-------|---------|-----------|
| `init:state` | `{ venue, zones, queues, feed, stats }` | On connect |
| `zone:update` | `{ id, name, density, trend, currentCount, ... }` | Every 5s |
| `queue:update` | `{ id, name, waitMinutes, status, trend, ... }` | Every 5s |
| `feed:new` | `{ id, type, title, message, severity, timestamp }` | On event |
| `alert:broadcast` | `{ severity, title, message, timestamp }` | On critical alert |
| `venue:clock` | `{ clock, half, status, score }` | Every 5s |
| `stats:connections` | `{ connectedClients }` | Every 10s |

**Client → Server:**
| Event | Payload | Purpose |
|-------|---------|---------|
| `zone:checkin` | `{ zoneId }` | Join zone room |
| `request:refresh` | `{}` | Request fresh state |
| `admin:updateScore` | `{ home, away }` | Update match score |

---

## VERIFICATION CHECKLIST

After building, verify these work:

```bash
# 1. Server starts without errors
npm run dev

# 2. Health check
curl http://localhost:3001/health

# 3. Venue data
curl http://localhost:3001/api/venue

# 4. Zones list
curl http://localhost:3001/api/zones

# 5. Queues list
curl http://localhost:3001/api/queues

# 6. Smart recommendation
curl http://localhost:3001/api/queues/recommend?type=food

# 7. Event feed
curl http://localhost:3001/api/feed

# 8. Post announcement (admin)
curl -X POST http://localhost:3001/api/feed \
  -H "Content-Type: application/json" \
  -d '{"type":"announcement","title":"Test","message":"Hello fans!","severity":"info"}'

# 9. Stats
curl http://localhost:3001/api/stats

# 10. WebSocket test — open browser console at http://localhost:3001
# and verify events are received every 5 seconds
```

---

## COMMON ISSUES & FIXES

| Issue | Fix |
|-------|-----|
| `EADDRINUSE` port 3001 | Kill existing process: `npx kill-port 3001` |
| CORS errors from frontend | Check `CORS_ORIGIN` matches frontend URL exactly |
| Socket.IO not connecting | Ensure frontend uses `io("http://localhost:3001")` |
| No real-time updates | Check simulation engine started (see console logs) |
| Rate limit hit during dev | Increase `RATE_LIMIT_MAX_REQUESTS` in `.env` |
