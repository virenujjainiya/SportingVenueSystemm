/*
 * Centralized configuration.
 * All environment variables are read and exported as a frozen object.
 * Validates required config at startup — fail fast rather than silent misconfiguration.
 */
require('dotenv').config();

// Validate required secrets at startup
const requiredInProduction = ['JWT_SECRET'];
if (process.env.NODE_ENV === 'production') {
  requiredInProduction.forEach((key) => {
    if (!process.env[key]) {
      console.error(`[CONFIG] FATAL: Missing required env var: ${key}`);
      process.exit(1);
    }
  });
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('[CONFIG] FATAL: JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }
}

const config = Object.freeze({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  apiVersion: process.env.API_VERSION || 'v1',

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'venueflow-dev-secret-change-in-prod',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || 'VenueFlow2026!',
  },

  simulation: {
    intervalMs: parseInt(process.env.SIMULATION_INTERVAL_MS, 10) || 5000,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    // Stricter limit for auth endpoints
    authWindowMs: 15 * 60 * 1000, // 15 minutes
    authMaxRequests: 10,           // 10 login attempts per 15 min
  },

  socket: {
    maxConnectionsPerIp: parseInt(process.env.MAX_CONNECTIONS_PER_IP, 10) || 50,
    pingInterval: 25000,
    pingTimeout: 20000,
  },
});

module.exports = config;
