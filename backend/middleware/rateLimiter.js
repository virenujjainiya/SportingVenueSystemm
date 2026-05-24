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
