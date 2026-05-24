/*
 * Queue Routes
 * GET  /api/queues             — All queue points with wait times
 * GET  /api/queues/:id         — Single queue detail
 * POST /api/queues/:id         — [ADMIN] Update queue (wait time, status)
 * GET  /api/queues/recommend   — Smart recommendation for shortest queue by type
 *
 * FIXES APPLIED:
 * - try-catch on all routes
 * - POST: validate waitMinutes is a number (not NaN)
 * - POST: validate status is a valid enum
 * - POST: reject empty update body
 * - GET /recommend: validate type query param
 * - GET /: validate type and status query params
 * - Consistent error codes for frontend
 */
const { Router } = require('express');
const store = require('../data/store');
const { getRecommendations } = require('../utils/recommendations');
const { safeInt, validateEnum } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const VALID_QUEUE_TYPES = ['food', 'drink', 'merch', 'restroom'];
const VALID_QUEUE_STATUSES = ['open', 'busy', 'closed'];

// GET smart recommendation — MUST be before /:id route
router.get('/recommend', (req, res, next) => {
  try {
    const { type } = req.query;

    // Validate type if provided
    if (type && !VALID_QUEUE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TYPE',
        message: `Invalid queue type "${type}". Must be one of: ${VALID_QUEUE_TYPES.join(', ')}`,
      });
    }

    const allQueues = store.getAllQueues();
    const recommendations = getRecommendations(allQueues, type || null);

    // If no recommendations found, return helpful message
    if (recommendations.length === 0) {
      return res.json({
        success: true,
        data: [],
        meta: {
          message: type
            ? `No open ${type} queues available right now. Try a different type.`
            : 'No open queues available right now. Please check back soon.',
        },
      });
    }

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (err) {
    next(err);
  }
});

// GET all queues
router.get('/', (req, res, next) => {
  try {
    const { type, status } = req.query;
    let allQueues = store.getAllQueues();

    // Validate type filter if provided
    if (type && !VALID_QUEUE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TYPE',
        message: `Invalid queue type "${type}". Must be one of: ${VALID_QUEUE_TYPES.join(', ')}`,
      });
    }

    // Validate status filter if provided
    if (status && !VALID_QUEUE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        message: `Invalid queue status "${status}". Must be one of: ${VALID_QUEUE_STATUSES.join(', ')}`,
      });
    }

    if (type) allQueues = allQueues.filter((q) => q.type === type);
    if (status) allQueues = allQueues.filter((q) => q.status === status);

    // Sort by wait time (shortest first)
    allQueues.sort((a, b) => a.waitMinutes - b.waitMinutes);

    res.json({
      success: true,
      data: allQueues,
      meta: {
        total: allQueues.length,
        avgWaitMinutes: allQueues.length > 0
          ? Math.round(allQueues.reduce((s, q) => s + q.waitMinutes, 0) / allQueues.length)
          : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET single queue
router.get('/:id', (req, res, next) => {
  try {
    const queue = store.getQueue(req.params.id);
    if (!queue) {
      return res.status(404).json({
        success: false,
        code: 'QUEUE_NOT_FOUND',
        message: `Queue "${req.params.id}" not found.`,
      });
    }
    res.json({ success: true, data: queue });
  } catch (err) {
    next(err);
  }
});

// POST update queue (admin) — requires JWT auth
router.post('/:id', requireAuth, (req, res, next) => {
  try {
    const { waitMinutes, status, peopleInQueue } = req.body;

    // Reject if body is empty
    if (waitMinutes === undefined && status === undefined && peopleInQueue === undefined) {
      return res.status(400).json({
        success: false,
        code: 'EMPTY_UPDATE',
        message: 'No fields to update. Provide at least one of: waitMinutes, status, peopleInQueue.',
      });
    }

    const updates = {};
    const errors = [];

    // Validate waitMinutes
    if (waitMinutes !== undefined) {
      const w = Number(waitMinutes);
      if (!Number.isFinite(w) || w < 0) {
        errors.push('waitMinutes must be a non-negative number');
      } else {
        updates.waitMinutes = Math.round(w);
      }
    }

    // Validate status enum
    if (status !== undefined) {
      if (!VALID_QUEUE_STATUSES.includes(status)) {
        errors.push(`status must be one of: ${VALID_QUEUE_STATUSES.join(', ')}`);
      } else {
        updates.status = status;
      }
    }

    // Validate peopleInQueue
    if (peopleInQueue !== undefined) {
      const p = safeInt(peopleInQueue, -1);
      if (p < 0) {
        errors.push('peopleInQueue must be a non-negative integer');
      } else {
        updates.peopleInQueue = p;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Invalid input.',
        errors,
      });
    }

    const queue = store.updateQueue(req.params.id, updates);
    if (!queue) {
      return res.status(404).json({
        success: false,
        code: 'QUEUE_NOT_FOUND',
        message: `Queue "${req.params.id}" not found.`,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('queue:update', queue);
    }

    res.json({ success: true, data: queue });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
