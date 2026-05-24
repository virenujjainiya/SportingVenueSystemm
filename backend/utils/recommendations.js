/*
 * Smart Queue Recommendation Engine
 *
 * Algorithm: Weighted scoring based on:
 *   - Wait time (60% weight) — lower is better
 *   - Crowd trend (20% weight) — shrinking queues preferred
 *   - Queue status (20% weight) — open > busy > closed
 *
 * Returns top 3 recommendations sorted by score.
 */

function calculateScore(queue) {
  // Wait time score (0-100, lower wait = higher score)
  const maxWait = 30; // minutes
  const waitScore = Math.max(0, (1 - queue.waitMinutes / maxWait)) * 100;

  // Trend score
  const trendScores = { shrinking: 100, stable: 60, growing: 20 };
  const trendScore = trendScores[queue.trend] || 60;

  // Status score
  const statusScores = { open: 100, busy: 50, closed: 0 };
  const statusScore = statusScores[queue.status] || 0;

  // Weighted total
  return (waitScore * 0.6) + (trendScore * 0.2) + (statusScore * 0.2);
}

function getRecommendations(allQueues, type = null) {
  let candidates = allQueues.filter((q) => q.status !== 'closed');

  if (type) {
    candidates = candidates.filter((q) => q.type === type);
  }

  const scored = candidates.map((q) => ({
    ...q,
    score: Math.round(calculateScore(q)),
    recommendation: generateMessage(q),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((q, i) => ({
    rank: i + 1,
    ...q,
    isBestChoice: i === 0,
  }));
}

function generateMessage(queue) {
  if (queue.waitMinutes <= 2) return `Almost no wait! Head to ${queue.name} now.`;
  if (queue.waitMinutes <= 5) return `Short wait at ${queue.name}. Good choice!`;
  if (queue.trend === 'shrinking') return `${queue.name} queue is getting shorter. Go now!`;
  if (queue.waitMinutes <= 10) return `Moderate wait at ${queue.name}. Consider going soon.`;
  return `${queue.name} is busy. Check alternatives.`;
}

module.exports = { getRecommendations, calculateScore };
