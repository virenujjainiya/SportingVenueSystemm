/*
 * Zone Routes
 * GET  /api/zones      — All zones with density data
 * GET  /api/zones/:id  — Single zone detail
 * POST /api/zones/:id  — [ADMIN] Update zone (e.g., close a zone)
 *
 * FIXES APPLIED:
 * - try-catch on all routes
 * - POST: validate density is a number, validate status enum
 * - POST: reject empty update body
 * - POST: validate currentCount is non-negative integer
 * - Consistent error codes for frontend
 */
const { Router } = require('express');
const store = require('../data/store');
const { safeInt, validateEnum } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const VALID_ZONE_STATUSES = ['open', 'closed', 'restricted', 'emergency'];

// GET all zones
router.get('/', (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// GET single zone
router.get('/:id', (req, res, next) => {
  try {
    const zone = store.getZone(req.params.id);
    if (!zone) {
      return res.status(404).json({
        success: false,
        code: 'ZONE_NOT_FOUND',
        message: `Zone "${req.params.id}" not found.`,
      });
    }
    // Include nearby queues
    const allQueues = store.getAllQueues();
    const nearbyQueues = allQueues.filter((q) => q.zone === zone.id);
    res.json({
      success: true,
      data: { ...zone, nearbyQueues },
    });
  } catch (err) {
    next(err);
  }
});

// POST update zone (admin) — requires JWT auth
router.post('/:id', requireAuth, (req, res, next) => {
  try {
    const { density, currentCount, status } = req.body;

    // Reject if body is empty or has no valid fields
    if (density === undefined && currentCount === undefined && status === undefined) {
      return res.status(400).json({
        success: false,
        code: 'EMPTY_UPDATE',
        message: 'No fields to update. Provide at least one of: density, currentCount, status.',
      });
    }

    const updates = {};
    const errors = [];

    // Validate density
    if (density !== undefined) {
      const d = Number(density);
      if (!Number.isFinite(d) || d < 0 || d > 100) {
        errors.push('density must be a number between 0 and 100');
      } else {
        updates.density = Math.round(d);
      }
    }

    // Validate currentCount
    if (currentCount !== undefined) {
      const c = safeInt(currentCount, -1);
      if (c < 0) {
        errors.push('currentCount must be a non-negative integer');
      } else {
        updates.currentCount = c;
      }
    }

    // Validate status enum
    if (status !== undefined) {
      if (!VALID_ZONE_STATUSES.includes(status)) {
        errors.push(`status must be one of: ${VALID_ZONE_STATUSES.join(', ')}`);
      } else {
        updates.status = status;
      }
    }

    // Return all validation errors at once
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Invalid input.',
        errors,
      });
    }

    const zone = store.updateZone(req.params.id, updates, { persist: true });
    if (!zone) {
      return res.status(404).json({
        success: false,
        code: 'ZONE_NOT_FOUND',
        message: `Zone "${req.params.id}" not found.`,
      });
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('zone:update', zone);
    }

    res.json({ success: true, data: zone });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
