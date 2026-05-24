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
