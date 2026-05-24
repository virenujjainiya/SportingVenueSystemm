/*
 * Venue Routes
 * GET /api/venue — Returns venue metadata, match info, weather
 *
 * FIXES APPLIED:
 * - try-catch with next(err) to prevent unhandled crashes
 * - Consistent error response shape
 */
const { Router } = require('express');
const store = require('../data/store');

const router = Router();

router.get('/', (req, res, next) => {
  try {
    const venue = store.getVenue();
    const stats = store.getStats();
    res.json({
      success: true,
      data: {
        ...venue,
        currentAttendance: stats.totalAttendance,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
