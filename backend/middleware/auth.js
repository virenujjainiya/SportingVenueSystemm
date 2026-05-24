/*
 * JWT Authentication Middleware
 *
 * STRATEGY: Stateless JWT — no session store needed (works at 100M scale).
 * Admin operations are protected by bearer token.
 * Public read APIs (GET /api/zones, /api/queues, etc.) remain open for attendees.
 *
 * TOKEN LIFECYCLE:
 *   1. Admin POSTs /api/auth/login with username + password
 *   2. Server validates, issues signed JWT (8h TTL)
 *   3. Client stores token, sends as: Authorization: Bearer <token>
 *   4. Protected routes call requireAuth() before processing
 *   5. Token expiry returns 401 → client redirects to login
 *
 * ROLES (extensible):
 *   - 'admin'    — full access: POST zones, queues, feed, scores
 *   - 'attendee' — read-only (no token needed, all GET routes are public)
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware: Require valid JWT bearer token.
 * Attach decoded payload to req.user.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      code: 'NO_TOKEN',
      message: 'Authentication required. Please login to access this endpoint.',
    });
  }

  // Support "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN_FORMAT',
      message: 'Authorization header must be in format: Bearer <token>',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Session expired. Please login again.',
        expiredAt: err.expiredAt,
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token.',
      });
    }
    // Unknown JWT error
    return res.status(401).json({
      success: false,
      code: 'AUTH_FAILED',
      message: 'Authentication failed.',
    });
  }
}

/**
 * Middleware: Require a specific role.
 * Usage: router.post('/', requireAuth, requireRole('admin'), handler)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `This action requires "${role}" role.`,
      });
    }
    next();
  };
}

/**
 * Optional auth — attach user if token present, but don't block if absent.
 * Useful for endpoints that have different responses for auth vs anonymous.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      try {
        req.user = jwt.verify(parts[1], config.auth.jwtSecret);
      } catch {
        // Ignore invalid tokens for optional auth
        req.user = null;
      }
    }
  }
  next();
}

module.exports = { requireAuth, requireRole, optionalAuth };
