/*
 * Auth Routes
 * POST /api/auth/login   — Exchange credentials for JWT
 * POST /api/auth/logout  — Client-side logout instructions
 * GET  /api/auth/me      — Verify token and return current user
 * POST /api/auth/refresh — Refresh a non-expired token
 *
 * SECURITY DESIGN:
 * - Passwords are compared in constant time (bcryptjs) to prevent timing attacks
 * - Login attempts are rate-limited (10/15min) separately from regular API
 * - Token is stateless JWT — no server-side session store needed
 * - Credentials stored in env vars (never hardcoded)
 */
const { Router } = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = Router();

// Pre-hash admin password at startup (not per-request) — performance optimization
// In production: passwords are stored hashed in DB, not in env
let hashedAdminPassword = null;
(async () => {
  hashedAdminPassword = await bcrypt.hash(config.auth.adminPassword, 10);
})();

// Strict rate limiter for login — separate from general API limiter
const loginLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,   // 15 minutes
  max: config.rateLimit.authMaxRequests,     // 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
  handler: (req, res, next, options) => res.status(429).json(options.message),
});

// In-memory admin user store (swap for DB query in production)
const ADMIN_USERS = [
  {
    id: 'admin-001',
    username: config.auth.adminUsername,
    role: 'admin',
    displayName: 'Stadium Admin',
  },
];

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, user, expiresAt }
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CREDENTIALS',
        message: 'username and password are required.',
      });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CREDENTIALS_TYPE',
        message: 'username and password must be strings.',
      });
    }

    // Find user (case-insensitive username)
    const user = ADMIN_USERS.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    // Use constant-time comparison even for "user not found" to prevent user enumeration
    const passwordToCompare = password;
    const hashToCompare = user
      ? hashedAdminPassword
      : '$2a$10$invalidhashtopreventtimingattack0000000000000000000000'; // dummy hash

    const isValid = await bcrypt.compare(passwordToCompare, hashToCompare);

    if (!user || !isValid) {
      // Generic message — don't reveal whether user exists or password is wrong
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
      });
    }

    // Issue JWT
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    };

    const token = jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
      issuer: 'venueflow-api',
      audience: 'venueflow-client',
    });

    // Decode to get exact expiry time for client
    const decoded = jwt.decode(token);

    console.log(`[AUTH] Login successful: ${user.username} (${user.role})`);

    res.json({
      success: true,
      data: {
        token,
        tokenType: 'Bearer',
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          displayName: user.displayName,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * JWT is stateless — client just discards the token.
 * This endpoint acknowledges the logout for client-side logic.
 */
router.post('/logout', requireAuth, (req, res) => {
  console.log(`[AUTH] Logout: ${req.user.username}`);
  res.json({
    success: true,
    message: 'Logged out successfully. Please discard your token.',
  });
});

/**
 * GET /api/auth/me
 * Verify token is valid and return current user info.
 * Frontend uses this on app load to check if session is still alive.
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.sub,
      username: req.user.username,
      role: req.user.role,
      displayName: req.user.displayName,
      tokenIssuedAt: new Date(req.user.iat * 1000).toISOString(),
      tokenExpiresAt: new Date(req.user.exp * 1000).toISOString(),
    },
  });
});

/**
 * POST /api/auth/refresh
 * Issue a new token if the current one is still valid (not expired).
 * Client should call this when token is within 30 mins of expiry.
 */
router.post('/refresh', requireAuth, (req, res) => {
  try {
    // Build new token with same payload
    const payload = {
      sub: req.user.sub,
      username: req.user.username,
      role: req.user.role,
      displayName: req.user.displayName,
    };

    const token = jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
      issuer: 'venueflow-api',
      audience: 'venueflow-client',
    });

    const decoded = jwt.decode(token);

    console.log(`[AUTH] Token refreshed: ${req.user.username}`);

    res.json({
      success: true,
      data: {
        token,
        tokenType: 'Bearer',
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      code: 'REFRESH_FAILED',
      message: 'Failed to refresh token.',
    });
  }
});

module.exports = router;
