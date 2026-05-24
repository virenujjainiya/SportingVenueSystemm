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
