/*
 * Shared Utility Functions
 */

// Clamp a number between min and max
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Random integer between min (inclusive) and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random float between min and max
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Pick random item from array
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Format timestamp for logging
function timestamp() {
  return new Date().toISOString();
}

/*
 * Async route wrapper — catches thrown errors and forwards to Express error handler.
 * Without this, async errors crash the process instead of returning JSON errors.
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/*
 * Sanitize user input — strip HTML tags to prevent XSS
 * when feed titles/messages are rendered in the UI.
 */
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .slice(0, 500); // max length
}

/*
 * Validate that a value is a finite number, otherwise return fallback.
 */
function safeInt(value, fallback = 0) {
  const num = parseInt(value, 10);
  return Number.isFinite(num) ? num : fallback;
}

/*
 * Check if a value is in an allowed list.
 * Returns the value if valid, otherwise null.
 */
function validateEnum(value, allowed) {
  return allowed.includes(value) ? value : null;
}

module.exports = { clamp, randomInt, randomFloat, randomPick, timestamp, asyncHandler, sanitize, safeInt, validateEnum };
