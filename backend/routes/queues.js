/*
 * Queue Routes
 * GET  /api/queues             — All queue points with wait times
 * GET  /api/queues/:id         — Single queue detail
 * POST /api/queues/:id         — [ADMIN] Update queue (wait time, status)
 * GET  /api/queues/recommend   — Smart recommendation for shortest queue by type
 *
 * Response shape for each queue:
 * { id, name, type, zone, waitMinutes, peopleInQueue, status, trend, x, y, icon, lastUpdated }
 */
const { Router } = require('express');
const store = require('../data/store');
const { getRecommendations } = require('../utils/recommendations');

const router = Router();

// GET smart recommendation — MUST be before /:id route
router.get('/recommend', (req, res) => {
  const { type } = req.query; // 'food' | 'drink' | 'merch' | 'restroom'
  const allQueues = store.getAllQueues();
  const recommendations = getRecommendations(allQueues, type);
  res.json({
    success: true,
    data: recommendations,
  });
});

// GET all queues
router.get('/', (req, res) => {
  const { type, status } = req.query;
  let allQueues = store.getAllQueues();

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
});

// GET single queue
router.get('/:id', (req, res) => {
  const queue = store.getQueue(req.params.id);
  if (!queue) {
    return res.status(404).json({ success: false, message: 'Queue not found' });
  }
  res.json({ success: true, data: queue });
});

// POST update queue (admin)
router.post('/:id', (req, res) => {
  const { waitMinutes, status, peopleInQueue } = req.body;
  const updates = {};
  if (waitMinutes !== undefined) updates.waitMinutes = Math.max(0, waitMinutes);
  if (status !== undefined) updates.status = status;
  if (peopleInQueue !== undefined) updates.peopleInQueue = Math.max(0, peopleInQueue);

  const queue = store.updateQueue(req.params.id, updates);
  if (!queue) {
    return res.status(404).json({ success: false, message: 'Queue not found' });
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('queue:update', queue);
  }

  res.json({ success: true, data: queue });
});

module.exports = router;
