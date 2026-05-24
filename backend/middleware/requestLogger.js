/*
 * Structured Request Logger
 *
 * Outputs machine-parseable JSON logs in production (for log aggregators like
 * Datadog, CloudWatch, Splunk) and human-readable color logs in development.
 *
 * Log fields:
 *   - timestamp, method, path, statusCode, durationMs
 *   - contentLength, ip, userAgent, requestId
 *   - userId (if authenticated)
 *
 * SCALE NOTE: At 100M users, pipe stdout to a log aggregation service.
 */
const { randomUUID } = require('crypto');
const config = require('../config');

// ANSI color codes for development
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorStatus(code) {
  if (code >= 500) return `${COLORS.red}${code}${COLORS.reset}`;
  if (code >= 400) return `${COLORS.yellow}${code}${COLORS.reset}`;
  if (code >= 300) return `${COLORS.cyan}${code}${COLORS.reset}`;
  return `${COLORS.green}${code}${COLORS.reset}`;
}

function requestLogger(req, res, next) {
  const start = Date.now();

  // Attach a unique request ID for tracing across logs
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  const originalEnd = res.end;
  res.end = function (...args) {
    const durationMs = Date.now() - start;
    const statusCode = res.statusCode;
    const contentLength = res.getHeader('content-length') || '-';
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const userId = req.user?.username || null;

    if (config.isProd) {
      // Structured JSON for log aggregators
      const logEntry = {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length ? req.query : undefined,
        statusCode,
        durationMs,
        contentLength,
        ip,
        userAgent: req.get('user-agent'),
        userId,
      };

      if (statusCode >= 400) {
        console.error(JSON.stringify(logEntry));
      } else {
        console.log(JSON.stringify(logEntry));
      }
    } else {
      // Human-readable for development
      const level = statusCode >= 400 ? 'WARN' : 'INFO';
      const colorCode = colorStatus(statusCode);
      const dur = durationMs > 100
        ? `${COLORS.yellow}${durationMs}ms${COLORS.reset}`
        : `${COLORS.gray}${durationMs}ms${COLORS.reset}`;
      const user = userId ? ` ${COLORS.cyan}[${userId}]${COLORS.reset}` : '';

      console.log(
        `${COLORS.gray}[${level}]${COLORS.reset} ${COLORS.bold}${req.method}${COLORS.reset} ${req.path} → ${colorCode} ${dur}${user} ${COLORS.gray}#${req.requestId.slice(0, 8)}${COLORS.reset}`
      );
    }

    originalEnd.apply(res, args);
  };

  next();
}

module.exports = requestLogger;
