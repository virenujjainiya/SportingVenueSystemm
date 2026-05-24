/*
 * In-Memory Data Store
 * 
 * SCALE NOTE: For 100M users, replace this module with Redis client.
 * The interface (get, set, getAll, update) stays identical.
 * All functions are synchronous now but return values directly.
 * When migrating to Redis, wrap returns in Promises — callers use await.
 *
 * DATA OWNED:
 * - venue: single object with venue metadata
 * - zones: Map<zoneId, ZoneObject>
 * - queues: Map<queueId, QueueObject>
 * - feed: Array<FeedItem> (newest first, capped at 100)
 */

const { v4: uuidv4 } = require('uuid');

// ============================================================
// VENUE METADATA
// ============================================================
const venue = {
  id: 'venue-001',
  name: 'MetLife Grand Stadium',
  sport: 'Football',
  capacity: 52000,
  currentAttendance: 0,
  status: 'live',        // 'upcoming' | 'live' | 'halftime' | 'ended'
  match: {
    homeTeam: { name: 'Thunder FC', shortName: 'THU', score: 0, logo: '⚡' },
    awayTeam: { name: 'Phoenix Rising', shortName: 'PHX', score: 0, logo: '🔥' },
    clock: '00:00',
    half: 1,
    startTime: new Date().toISOString(),
  },
  weather: { temp: 24, condition: 'Clear', icon: '☀️' },
};

// ============================================================
// ZONES — Stadium sections with crowd density
// ============================================================
const zones = new Map();

const zoneDefinitions = [
  { id: 'zone-north', name: 'North Stand', type: 'seating', capacity: 8000, x: 50, y: 10 },
  { id: 'zone-south', name: 'South Stand', type: 'seating', capacity: 8000, x: 50, y: 90 },
  { id: 'zone-east', name: 'East Wing', type: 'seating', capacity: 7000, x: 90, y: 50 },
  { id: 'zone-west', name: 'West Wing', type: 'seating', capacity: 7000, x: 10, y: 50 },
  { id: 'zone-vip', name: 'VIP Lounge', type: 'vip', capacity: 2000, x: 50, y: 50 },
  { id: 'zone-concourse-n', name: 'North Concourse', type: 'concourse', capacity: 5000, x: 50, y: 25 },
  { id: 'zone-concourse-s', name: 'South Concourse', type: 'concourse', capacity: 5000, x: 50, y: 75 },
  { id: 'zone-gate-a', name: 'Gate A Entry', type: 'gate', capacity: 3000, x: 15, y: 15 },
  { id: 'zone-gate-b', name: 'Gate B Entry', type: 'gate', capacity: 3000, x: 85, y: 15 },
  { id: 'zone-gate-c', name: 'Gate C Entry', type: 'gate', capacity: 3000, x: 85, y: 85 },
  { id: 'zone-gate-d', name: 'Gate D Entry', type: 'gate', capacity: 3000, x: 15, y: 85 },
];

zoneDefinitions.forEach((z) => {
  const currentCount = Math.floor(z.capacity * (0.3 + Math.random() * 0.4));
  zones.set(z.id, {
    ...z,
    currentCount,
    density: Math.round((currentCount / z.capacity) * 100),
    trend: 'stable', // 'rising' | 'falling' | 'stable'
    lastUpdated: new Date().toISOString(),
  });
});

// ============================================================
// QUEUES — Food, drink, merch, restroom points
// ============================================================
const queues = new Map();

const queueDefinitions = [
  { id: 'q-food-1', name: 'Burger & Fries Stand', type: 'food', zone: 'zone-concourse-n', x: 35, y: 22, icon: '🍔' },
  { id: 'q-food-2', name: 'Pizza Corner', type: 'food', zone: 'zone-concourse-n', x: 65, y: 22, icon: '🍕' },
  { id: 'q-food-3', name: 'Hot Dog Express', type: 'food', zone: 'zone-concourse-s', x: 40, y: 78, icon: '🌭' },
  { id: 'q-food-4', name: 'Taco Station', type: 'food', zone: 'zone-concourse-s', x: 60, y: 78, icon: '🌮' },
  { id: 'q-drink-1', name: 'Craft Beer Bar', type: 'drink', zone: 'zone-concourse-n', x: 50, y: 20, icon: '🍺' },
  { id: 'q-drink-2', name: 'Smoothie & Juice', type: 'drink', zone: 'zone-concourse-s', x: 50, y: 80, icon: '🥤' },
  { id: 'q-merch-1', name: 'Official Merch Store', type: 'merch', zone: 'zone-gate-a', x: 20, y: 18, icon: '👕' },
  { id: 'q-merch-2', name: 'Fan Zone Shop', type: 'merch', zone: 'zone-gate-c', x: 80, y: 82, icon: '🧢' },
  { id: 'q-restroom-1', name: 'Restroom North', type: 'restroom', zone: 'zone-concourse-n', x: 25, y: 28, icon: '🚻' },
  { id: 'q-restroom-2', name: 'Restroom South', type: 'restroom', zone: 'zone-concourse-s', x: 75, y: 72, icon: '🚻' },
  { id: 'q-restroom-3', name: 'Restroom East', type: 'restroom', zone: 'zone-east', x: 88, y: 45, icon: '🚻' },
  { id: 'q-restroom-4', name: 'Restroom West', type: 'restroom', zone: 'zone-west', x: 12, y: 55, icon: '🚻' },
];

queueDefinitions.forEach((q) => {
  const waitMinutes = Math.floor(Math.random() * 15) + 1;
  queues.set(q.id, {
    ...q,
    waitMinutes,
    peopleInQueue: waitMinutes * 3,
    status: 'open',        // 'open' | 'busy' | 'closed'
    trend: 'stable',       // 'growing' | 'shrinking' | 'stable'
    lastUpdated: new Date().toISOString(),
  });
});

// ============================================================
// LIVE FEED — Score updates, announcements, alerts
// ============================================================
const feed = [];
const MAX_FEED_ITEMS = 100;

// Seed initial feed items
const seedFeed = [
  { type: 'announcement', title: 'Welcome!', message: 'Welcome to MetLife Grand Stadium! Enjoy the match.', severity: 'info' },
  { type: 'announcement', title: 'Gates Open', message: 'All gates are now open. Find your seat using the venue map.', severity: 'info' },
  { type: 'score', title: 'Kickoff!', message: 'The match has begun! Thunder FC vs Phoenix Rising.', severity: 'info' },
];

seedFeed.forEach((item, i) => {
  feed.push({
    id: uuidv4(),
    ...item,
    timestamp: new Date(Date.now() - (seedFeed.length - i) * 60000).toISOString(),
  });
});

// ============================================================
// STORE API — This interface stays the same when migrating to Redis
// ============================================================
const store = {
  // Venue — deep copy to prevent reference leaks on nested match object
  getVenue: () => JSON.parse(JSON.stringify(venue)),
  updateVenue: (updates) => {
    // Shallow merge top-level, but deep merge 'match' to prevent overwriting nested objects
    if (updates.match) {
      Object.assign(venue.match, updates.match);
      if (updates.match.homeTeam) Object.assign(venue.match.homeTeam, updates.match.homeTeam);
      if (updates.match.awayTeam) Object.assign(venue.match.awayTeam, updates.match.awayTeam);
      delete updates.match;
    }
    Object.assign(venue, updates);
  },

  // Zones
  getZone: (id) => zones.has(id) ? { ...zones.get(id) } : null,
  getAllZones: () => Array.from(zones.values()).map((z) => ({ ...z })),
  updateZone: (id, updates) => {
    if (!zones.has(id)) return null;
    const zone = zones.get(id);
    Object.assign(zone, updates, { lastUpdated: new Date().toISOString() });
    return { ...zone };
  },

  // Queues
  getQueue: (id) => queues.has(id) ? { ...queues.get(id) } : null,
  getAllQueues: () => Array.from(queues.values()).map((q) => ({ ...q })),
  updateQueue: (id, updates) => {
    if (!queues.has(id)) return null;
    const queue = queues.get(id);
    Object.assign(queue, updates, { lastUpdated: new Date().toISOString() });
    return { ...queue };
  },

  // Feed
  getFeed: (limit = 50) => feed.slice(-limit).reverse(),
  addFeedItem: (item) => {
    const feedItem = {
      id: uuidv4(),
      ...item,
      timestamp: new Date().toISOString(),
    };
    feed.push(feedItem);
    if (feed.length > MAX_FEED_ITEMS) feed.shift();
    return feedItem;
  },

  // Stats (for admin dashboard)
  getStats: () => {
    const allZones = Array.from(zones.values());
    const allQueues = Array.from(queues.values());
    return {
      totalAttendance: allZones.reduce((sum, z) => sum + z.currentCount, 0),
      avgDensity: Math.round(allZones.reduce((sum, z) => sum + z.density, 0) / allZones.length),
      avgWaitTime: Math.round(allQueues.reduce((sum, q) => sum + q.waitMinutes, 0) / allQueues.length),
      openQueues: allQueues.filter((q) => q.status === 'open').length,
      totalQueues: allQueues.length,
      highDensityZones: allZones.filter((z) => z.density > 80).length,
    };
  },

  // Direct refs for simulation engine (avoid copy overhead)
  _zones: zones,
  _queues: queues,
  _venue: venue,
};

module.exports = store;
