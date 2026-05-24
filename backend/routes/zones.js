/*
 * Zone Routes
 * GET  /api/zones      — All zones with density data
 * GET  /api/zones/:id  — Single zone detail
 * POST /api/zones/:id  — [ADMIN] Update zone (e.g., close a zone)
 *
 * Response shape for each zone:
 * { id, name, type, capacity, currentCount, density (0-100), trend, x, y, lastUpdated }
 */
const { Router } = require('express');
const store = require('../data/store');

const router = Router();

// GET all zones
router.get('/', (req, res) => {
  const zones = store.getAllZones();
  const stats = store.getStats();
  res.json({
    success: true,
    data: zones,
    meta: {
      totalZones: zones.length,
      avgDensity: stats.avgDensity,
      highDensityCount: stats.highDensityZones,
    },
  });
});

// GET single zone
router.get('/:id', (req, res) => {
  const zone = store.getZone(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }
  // Include nearby queues
  const allQueues = store.getAllQueues();
  const nearbyQueues = allQueues.filter((q) => q.zone === zone.id);
  res.json({
    success: true,
    data: { ...zone, nearbyQueues },
  });
});

// POST update zone (admin)
router.post('/:id', (req, res) => {
  const { density, currentCount, status } = req.body;
  const updates = {};
  if (density !== undefined) updates.density = Math.min(100, Math.max(0, density));
  if (currentCount !== undefined) updates.currentCount = currentCount;
  if (status !== undefined) updates.status = status;

  const zone = store.updateZone(req.params.id, updates);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }

  // Emit real-time update (io is attached in socket.js)
  const io = req.app.get('io');
  if (io) {
    io.emit('zone:update', zone);
  }

  res.json({ success: true, data: zone });
});

module.exports = router;
