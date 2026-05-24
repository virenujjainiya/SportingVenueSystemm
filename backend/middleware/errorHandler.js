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
