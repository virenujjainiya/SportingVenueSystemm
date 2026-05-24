/*
 * Feed Routes
 * GET  /api/feed  — Get live event feed (scores, announcements, alerts)
 * POST /api/feed  — [ADMIN] Post new feed item
 *
 * FIXES APPLIED:
 * - try-catch on all routes
 * - POST: validate severity enum (was accepting any value like "banana")
 * - POST: sanitize title and message (XSS prevention)
 * - POST: validate title/message length
 * - GET: clamp limit to 1-100 range (negative limit caused wrong results)
 * - Consistent error codes for frontend
 */
const { Router } = require('express');
const store = require('../data/store');
const { sanitize } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const VALID_FEED_TYPES = ['score', 'announcement', 'alert', 'milestone'];
const VALID_SEVERITIES = ['info', 'warning', 'critical'];

// GET feed
router.get('/', (req, res, next) => {
  try {
    // Clamp limit to 1-100 (negative or zero would cause wrong results)
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;

    let items = store.getFeed(limit);

    // Validate type filter if provided
    if (req.query.type) {
      if (!VALID_FEED_TYPES.includes(req.query.type)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_TYPE',
          message: `Invalid feed type "${req.query.type}". Must be one of: ${VALID_FEED_TYPES.join(', ')}`,
        });
      }
      items = items.filter((item) => item.type === req.query.type);
    }

    res.json({
      success: true,
      data: items,
      meta: { count: items.length, limit },
    });
  } catch (err) {
    next(err);
  }
});

// POST new feed item (admin) — requires JWT auth
router.post('/', requireAuth, (req, res, next) => {
  try {
    const { type, title, message, severity } = req.body;
    const errors = [];

    // Check required fields
    if (!type) errors.push('type is required');
    if (!title) errors.push('title is required');
    if (!message) errors.push('message is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Missing required fields.',
        errors,
      });
    }

    // Validate type enum
    if (!VALID_FEED_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TYPE',
        message: `Invalid type "${type}". Must be one of: ${VALID_FEED_TYPES.join(', ')}`,
      });
    }

    // Validate severity enum (was previously accepting anything)
    const safeSeverity = severity || 'info';
    if (!VALID_SEVERITIES.includes(safeSeverity)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SEVERITY',
        message: `Invalid severity "${severity}". Must be one of: ${VALID_SEVERITIES.join(', ')}`,
      });
    }

    // Validate string lengths
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'title must be a non-empty string.',
      });
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'message must be a non-empty string.',
      });
    }

    // Sanitize inputs to prevent XSS when rendered in frontend
    const safeTitle = sanitize(title);
    const safeMessage = sanitize(message);

    const feedItem = store.addFeedItem({
      type,
      title: safeTitle,
      message: safeMessage,
      severity: safeSeverity,
    });

    // Broadcast to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('feed:new', feedItem);
      // Critical alerts get special broadcast
      if (safeSeverity === 'critical') {
        io.emit('alert:broadcast', {
          severity: 'critical',
          title: safeTitle,
          message: safeMessage,
          timestamp: feedItem.timestamp,
        });
      }
    }

    res.status(201).json({ success: true, data: feedItem });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
