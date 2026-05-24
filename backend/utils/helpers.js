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

module.exports = { clamp, randomInt, randomFloat, randomPick, timestamp };
