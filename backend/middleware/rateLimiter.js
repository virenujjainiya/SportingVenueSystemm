/*
 * Rate Limiter
 * Protects API from abuse. At 100M scale, replace with Redis-backed limiter.
 * Current: 100 requests per minute per IP.
 *
 * FIX: Response shape now matches all other errors: { success: false, code, message }
 */
const rateLimit = require('express-rate-limit');
const config = require('../config');

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please try again later.',
    retryAfterMs: config.rateLimit.windowMs,
  },
  // Custom handler for proper status code and headers
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
});

module.exports = apiLimiter;
