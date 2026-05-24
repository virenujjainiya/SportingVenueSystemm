/*
 * Venue Routes
 * GET /api/venue — Returns venue metadata, match info, weather
 * 
 * Response shape:
 * {
 *   id, name, sport, capacity, currentAttendance, status,
 *   match: { homeTeam, awayTeam, clock, half, startTime },
 *   weather: { temp, condition, icon }
 * }
 */
const { Router } = require('express');
const store = require('../data/store');

const router = Router();

router.get('/', (req, res) => {
  const venue = store.getVenue();
  const stats = store.getStats();
  res.json({
    success: true,
    data: {
      ...venue,
      currentAttendance: stats.totalAttendance,
    },
  });
});

module.exports = router;
