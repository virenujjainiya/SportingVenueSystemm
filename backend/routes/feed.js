/*
 * Feed Routes
 * GET  /api/feed  — Get live event feed (scores, announcements, alerts)
 * POST /api/feed  — [ADMIN] Post new feed item
 *
 * Query params for GET:
 *   ?limit=20    — Number of items (default 50, max 100)
 *   ?type=score  — Filter by type
 *
 * POST body:
 *   { type: 'score'|'announcement'|'alert'|'milestone',
 *     title: string, message: string, severity: 'info'|'warning'|'critical' }
 */
const { Router } = require('express');
const store = require('../data/store');

const router = Router();

// GET feed
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  let items = store.getFeed(limit);

  if (req.query.type) {
    items = items.filter((item) => item.type === req.query.type);
  }

  res.json({
    success: true,
    data: items,
    meta: { count: items.length, limit },
  });
});

// POST new feed item (admin)
router.post('/', (req, res) => {
  const { type, title, message, severity } = req.body;

  if (!type || !title || !message) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: type, title, message',
    });
  }

  const validTypes = ['score', 'announcement', 'alert', 'milestone'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
    });
  }

  const feedItem = store.addFeedItem({
    type,
    title,
    message,
    severity: severity || 'info',
  });

  // Broadcast to all connected clients
  const io = req.app.get('io');
  if (io) {
    io.emit('feed:new', feedItem);
    // Critical alerts get special broadcast
    if (severity === 'critical') {
      io.emit('alert:broadcast', {
        severity: 'critical',
        title,
        message,
        timestamp: feedItem.timestamp,
      });
    }
  }

  res.status(201).json({ success: true, data: feedItem });
});

module.exports = router;
