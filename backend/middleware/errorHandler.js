/*
 * Global Error Handler
 * Catches all unhandled errors and returns consistent JSON responses.
 * In production, errors are sanitized to prevent info leakage.
 *
 * FIXES APPLIED:
 * - Consistent shape: always { success: false, message, code } matching all other error responses
 * - headersSent guard: prevents "Cannot set headers after they are sent" crash
 * - JSON parse errors: catches malformed request body (SyntaxError from express.json)
 * - Includes error code for frontend to differentiate error types
 */
const config = require('../config');

function errorHandler(err, req, res, _next) {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    console.error(`[ERROR] Headers already sent for ${req.method} ${req.path}:`, err.message);
    return;
  }

  // Handle JSON parse errors from malformed request bodies
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    console.error(`[ERROR] Malformed JSON body: ${req.method} ${req.path}`);
    return res.status(400).json({
      success: false,
      code: 'INVALID_JSON',
      message: 'Request body contains invalid JSON. Please check your request format.',
    });
  }

  // Handle payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body is too large. Maximum size is 1MB.',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = config.nodeEnv === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  // Determine error code for frontend
  let code = 'SERVER_ERROR';
  if (statusCode === 400) code = 'BAD_REQUEST';
  else if (statusCode === 404) code = 'NOT_FOUND';
  else if (statusCode === 429) code = 'RATE_LIMITED';
  else if (statusCode === 413) code = 'PAYLOAD_TOO_LARGE';

  console.error(`[ERROR] ${req.method} ${req.path} → ${statusCode}:`, err.message);
  if (config.nodeEnv === 'development' && statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(config.nodeEnv === 'development' && statusCode === 500 && { stack: err.stack }),
  });
}

module.exports = errorHandler;
