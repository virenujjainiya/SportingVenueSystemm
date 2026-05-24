/**
 * VenueFlow Data Store — Supabase-backed with in-memory cache
 *
 * ARCHITECTURE:
 * - On startup: loads seed data from Supabase into memory cache
 * - Reads: always served from memory cache (microsecond fast, supports 100M users)
 * - Writes: written to memory immediately, then persisted to Supabase async
 * - Simulation engine: updates memory only (5s interval, DB would be too chatty)
 * - Admin actions: written to both memory AND Supabase (persistent)
 * - Feed items: always written to Supabase (announcements must survive restarts)
 *
 * FALLBACK: If Supabase is unavailable, falls back to in-memory seed data gracefully.
 * The API interface is identical whether using DB or memory — routes don't change.
 */

const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');

const VENUE_ID = process.env.VENUE_ID || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const DB_ENABLED = !!supabase;

// ── In-Memory Cache ────────────────────────────────────────────────────────
// Seeded with defaults — overwritten by Supabase data on init()
let venue = {
  id: 'venue-001',
  name: 'MetLife Grand Stadium',
  sport: 'Football',
  capacity: 52000,
  currentAttendance: 0,
  status: 'live',
  match: {
    homeTeam: { name: 'Thunder FC', shortName: 'THU', score: 0, logo: '⚡' },
    awayTeam: { name: 'Phoenix Rising', shortName: 'PHX', score: 0, logo: '🔥' },
    clock: '00:00',
    half: 1,
    startTime: new Date().toISOString(),
  },
  weather: { temp: 24, condition: 'Clear', icon: '☀️' },
};

const zones = new Map();
const queues = new Map();
let feed = [];
const MAX_FEED_ITEMS = 100;

// ── Default seed data (used when Supabase is unavailable) ──────────────────
function seedDefaults() {
  const zoneDefinitions = [
    { id: 'zone-north',       name: 'North Stand',      type: 'seating',   capacity: 8000, x: 50, y: 10 },
    { id: 'zone-south',       name: 'South Stand',      type: 'seating',   capacity: 8000, x: 50, y: 90 },
    { id: 'zone-east',        name: 'East Wing',        type: 'seating',   capacity: 7000, x: 90, y: 50 },
    { id: 'zone-west',        name: 'West Wing',        type: 'seating',   capacity: 7000, x: 10, y: 50 },
    { id: 'zone-vip',         name: 'VIP Lounge',       type: 'vip',       capacity: 2000, x: 50, y: 50 },
    { id: 'zone-concourse-n', name: 'North Concourse',  type: 'concourse', capacity: 5000, x: 50, y: 25 },
    { id: 'zone-concourse-s', name: 'South Concourse',  type: 'concourse', capacity: 5000, x: 50, y: 75 },
    { id: 'zone-gate-a',      name: 'Gate A Entry',     type: 'gate',      capacity: 3000, x: 15, y: 15 },
    { id: 'zone-gate-b',      name: 'Gate B Entry',     type: 'gate',      capacity: 3000, x: 85, y: 15 },
    { id: 'zone-gate-c',      name: 'Gate C Entry',     type: 'gate',      capacity: 3000, x: 85, y: 85 },
    { id: 'zone-gate-d',      name: 'Gate D Entry',     type: 'gate',      capacity: 3000, x: 15, y: 85 },
  ];

  zoneDefinitions.forEach((z) => {
    const currentCount = Math.floor(z.capacity * (0.3 + Math.random() * 0.4));
    zones.set(z.id, {
      ...z,
      currentCount,
      density: Math.round((currentCount / z.capacity) * 100),
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    });
  });

  const queueDefinitions = [
    { id: 'q-food-1',     name: 'Burger & Fries Stand',  type: 'food',     zone: 'zone-concourse-n', x: 35, y: 22, icon: '🍔' },
    { id: 'q-food-2',     name: 'Pizza Corner',           type: 'food',     zone: 'zone-concourse-n', x: 65, y: 22, icon: '🍕' },
    { id: 'q-food-3',     name: 'Hot Dog Express',         type: 'food',     zone: 'zone-concourse-s', x: 40, y: 78, icon: '🌭' },
    { id: 'q-food-4',     name: 'Taco Station',            type: 'food',     zone: 'zone-concourse-s', x: 60, y: 78, icon: '🌮' },
    { id: 'q-drink-1',    name: 'Craft Beer Bar',          type: 'drink',    zone: 'zone-concourse-n', x: 50, y: 20, icon: '🍺' },
    { id: 'q-drink-2',    name: 'Smoothie & Juice',        type: 'drink',    zone: 'zone-concourse-s', x: 50, y: 80, icon: '🥤' },
    { id: 'q-merch-1',    name: 'Official Merch Store',    type: 'merch',    zone: 'zone-gate-a',      x: 20, y: 18, icon: '👕' },
    { id: 'q-merch-2',    name: 'Fan Zone Shop',           type: 'merch',    zone: 'zone-gate-c',      x: 80, y: 82, icon: '🧢' },
    { id: 'q-restroom-1', name: 'Restroom North',          type: 'restroom', zone: 'zone-concourse-n', x: 25, y: 28, icon: '🚻' },
    { id: 'q-restroom-2', name: 'Restroom South',          type: 'restroom', zone: 'zone-concourse-s', x: 75, y: 72, icon: '🚻' },
    { id: 'q-restroom-3', name: 'Restroom East',           type: 'restroom', zone: 'zone-east',        x: 88, y: 45, icon: '🚻' },
    { id: 'q-restroom-4', name: 'Restroom West',           type: 'restroom', zone: 'zone-west',        x: 12, y: 55, icon: '🚻' },
  ];

  queueDefinitions.forEach((q) => {
    const waitMinutes = Math.floor(Math.random() * 15) + 1;
    queues.set(q.id, {
      ...q,
      waitMinutes,
      peopleInQueue: waitMinutes * 3,
      status: 'open',
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    });
  });

  feed.push(
    { id: uuidv4(), type: 'announcement', title: 'Welcome!', message: 'Welcome to MetLife Grand Stadium! Enjoy the match.', severity: 'info', timestamp: new Date(Date.now() - 120000).toISOString() },
    { id: uuidv4(), type: 'announcement', title: 'Gates Open', message: 'All gates are now open. Find your seat using the venue map.', severity: 'info', timestamp: new Date(Date.now() - 60000).toISOString() },
    { id: uuidv4(), type: 'score', title: 'Kickoff!', message: 'The match has begun! Thunder FC vs Phoenix Rising.', severity: 'info', timestamp: new Date().toISOString() }
  );
}

// ── Load from Supabase ─────────────────────────────────────────────────────
async function loadFromSupabase() {
  try {
    // Load venue
    const { data: venueRow, error: venueErr } = await supabase
      .from('venues')
      .select('*')
      .eq('id', VENUE_ID)
      .single();

    if (!venueErr && venueRow) {
      venue.name = venueRow.name;
      venue.sport = venueRow.sport;
      venue.capacity = venueRow.capacity;
      venue.status = venueRow.status;
      venue.match.homeTeam.name = venueRow.home_team_name;
      venue.match.homeTeam.shortName = venueRow.home_team_short;
      venue.match.homeTeam.score = venueRow.home_team_score;
      venue.match.awayTeam.name = venueRow.away_team_name;
      venue.match.awayTeam.shortName = venueRow.away_team_short;
      venue.match.awayTeam.score = venueRow.away_team_score;
      venue.match.clock = venueRow.match_clock;
      venue.match.half = venueRow.match_half;
      venue.weather.temp = venueRow.weather_temp;
      venue.weather.condition = venueRow.weather_condition;
      console.log('[DB] ✅ Venue loaded from Supabase');
    } else {
      console.warn('[DB] ⚠️  Venue not found in Supabase — using default. Error:', venueErr?.message);
    }

    // Load zones
    const { data: zoneRows, error: zonesErr } = await supabase
      .from('zones')
      .select('*')
      .eq('venue_id', VENUE_ID);

    if (!zonesErr && zoneRows?.length > 0) {
      zones.clear();
      zoneRows.forEach((z) => {
        zones.set(z.id, {
          id: z.id,
          name: z.name,
          type: z.type,
          capacity: z.capacity,
          currentCount: z.current_count,
          density: z.density,
          trend: z.trend,
          x: z.pos_x,
          y: z.pos_y,
          lastUpdated: z.updated_at,
        });
      });
      console.log(`[DB] ✅ ${zoneRows.length} zones loaded from Supabase`);
    } else {
      console.warn('[DB] ⚠️  Zones not found in Supabase — using defaults. Error:', zonesErr?.message);
    }

    // Load queues
    const { data: queueRows, error: queuesErr } = await supabase
      .from('queues')
      .select('*')
      .eq('venue_id', VENUE_ID);

    if (!queuesErr && queueRows?.length > 0) {
      queues.clear();
      queueRows.forEach((q) => {
        queues.set(q.id, {
          id: q.id,
          name: q.name,
          type: q.type,
          zone: q.zone_id,
          icon: q.icon,
          waitMinutes: q.wait_minutes,
          peopleInQueue: q.people_in_queue,
          status: q.status,
          trend: q.trend,
          x: q.pos_x,
          y: q.pos_y,
          lastUpdated: q.updated_at,
        });
      });
      console.log(`[DB] ✅ ${queueRows.length} queues loaded from Supabase`);
    } else {
      console.warn('[DB] ⚠️  Queues not found in Supabase — using defaults. Error:', queuesErr?.message);
    }

    // Load recent feed (last 50 items)
    const { data: feedRows, error: feedErr } = await supabase
      .from('feed')
      .select('*')
      .eq('venue_id', VENUE_ID)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!feedErr && feedRows?.length > 0) {
      feed = feedRows.map((f) => ({
        id: f.id,
        type: f.type,
        title: f.title,
        message: f.message,
        severity: f.severity,
        timestamp: f.created_at,
      }));
      console.log(`[DB] ✅ ${feedRows.length} feed items loaded from Supabase`);
    } else {
      console.warn('[DB] ⚠️  Feed not found in Supabase — using defaults. Error:', feedErr?.message);
    }

  } catch (err) {
    console.error('[DB] ❌ Failed to load from Supabase:', err.message);
    console.warn('[DB] Falling back to in-memory seed data');
  }
}

// ── Store Initialization ───────────────────────────────────────────────────
// Called once at server startup. Routes are not available until this resolves.
async function init() {
  // Always seed defaults first (instant)
  seedDefaults();

  if (DB_ENABLED) {
    console.log('[DB] Connecting to Supabase...');
    await loadFromSupabase();
    console.log('[DB] 🗄️  Supabase integration active');
  } else {
    console.log('[DB] 📦 Running with in-memory store (no SUPABASE_URL set)');
  }
}

// ── Async persist helpers ──────────────────────────────────────────────────
// Fire-and-forget DB writes — memory is already updated, so API responds instantly
async function persistZone(id, updates) {
  if (!DB_ENABLED) return;
  const dbUpdates = {};
  if (updates.density !== undefined) dbUpdates.density = updates.density;
  if (updates.currentCount !== undefined) dbUpdates.current_count = updates.currentCount;
  if (updates.trend !== undefined) dbUpdates.trend = updates.trend;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (Object.keys(dbUpdates).length === 0) return;
  const { error } = await supabase.from('zones').update(dbUpdates).eq('id', id);
  if (error) console.error(`[DB] Failed to persist zone ${id}:`, error.message);
}

async function persistQueue(id, updates) {
  if (!DB_ENABLED) return;
  const dbUpdates = {};
  if (updates.waitMinutes !== undefined) dbUpdates.wait_minutes = updates.waitMinutes;
  if (updates.peopleInQueue !== undefined) dbUpdates.people_in_queue = updates.peopleInQueue;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.trend !== undefined) dbUpdates.trend = updates.trend;
  if (Object.keys(dbUpdates).length === 0) return;
  const { error } = await supabase.from('queues').update(dbUpdates).eq('id', id);
  if (error) console.error(`[DB] Failed to persist queue ${id}:`, error.message);
}

async function persistVenueScore(homeScore, awayScore) {
  if (!DB_ENABLED) return;
  const { error } = await supabase
    .from('venues')
    .update({ home_team_score: homeScore, away_team_score: awayScore })
    .eq('id', VENUE_ID);
  if (error) console.error('[DB] Failed to persist venue score:', error.message);
}

async function persistFeedItem(item) {
  if (!DB_ENABLED) return;
  const { error } = await supabase.from('feed').insert({
    id: item.id,
    venue_id: VENUE_ID,
    type: item.type,
    title: item.title,
    message: item.message,
    severity: item.severity,
  });
  if (error) console.error('[DB] Failed to persist feed item:', error.message);
}

// ── Store API (same interface as before — routes unchanged) ────────────────
const store = {
  // Venue — deep copy to prevent reference leaks
  getVenue: () => JSON.parse(JSON.stringify(venue)),
  updateVenue: (updates) => {
    if (updates.match) {
      Object.assign(venue.match, updates.match);
      if (updates.match.homeTeam) Object.assign(venue.match.homeTeam, updates.match.homeTeam);
      if (updates.match.awayTeam) Object.assign(venue.match.awayTeam, updates.match.awayTeam);
      // Persist score change to DB async (fire-and-forget)
      if (updates.match.homeTeam?.score !== undefined || updates.match.awayTeam?.score !== undefined) {
        persistVenueScore(venue.match.homeTeam.score, venue.match.awayTeam.score).catch(() => {});
      }
      delete updates.match;
    }
    Object.assign(venue, updates);
  },

  // Zones
  getZone: (id) => zones.has(id) ? { ...zones.get(id) } : null,
  getAllZones: () => Array.from(zones.values()).map((z) => ({ ...z })),
  updateZone: (id, updates, { persist = false } = {}) => {
    if (!zones.has(id)) return null;
    const zone = zones.get(id);
    Object.assign(zone, updates, { lastUpdated: new Date().toISOString() });
    // Only persist admin-triggered updates (not every 5s simulation tick)
    if (persist) persistZone(id, updates).catch(() => {});
    return { ...zone };
  },

  // Queues
  getQueue: (id) => queues.has(id) ? { ...queues.get(id) } : null,
  getAllQueues: () => Array.from(queues.values()).map((q) => ({ ...q })),
  updateQueue: (id, updates, { persist = false } = {}) => {
    if (!queues.has(id)) return null;
    const queue = queues.get(id);
    Object.assign(queue, updates, { lastUpdated: new Date().toISOString() });
    // Only persist admin-triggered updates
    if (persist) persistQueue(id, updates).catch(() => {});
    return { ...queue };
  },

  // Feed — always write to DB for persistence
  getFeed: (limit = 50) => feed.slice(0, limit),
  addFeedItem: (item) => {
    const feedItem = {
      id: uuidv4(),
      ...item,
      timestamp: new Date().toISOString(),
    };
    feed.unshift(feedItem); // Prepend (newest first)
    if (feed.length > MAX_FEED_ITEMS) feed.pop();
    // Always persist feed to DB (fire-and-forget)
    persistFeedItem(feedItem).catch(() => {});
    return feedItem;
  },

  // Stats (computed from memory cache — always fast)
  getStats: () => {
    const allZones = Array.from(zones.values());
    const allQueues = Array.from(queues.values());
    return {
      totalAttendance: allZones.reduce((sum, z) => sum + z.currentCount, 0),
      avgDensity: allZones.length > 0
        ? Math.round(allZones.reduce((sum, z) => sum + z.density, 0) / allZones.length)
        : 0,
      avgWaitTime: allQueues.length > 0
        ? Math.round(allQueues.reduce((sum, q) => sum + q.waitMinutes, 0) / allQueues.length)
        : 0,
      openQueues: allQueues.filter((q) => q.status === 'open').length,
      totalQueues: allQueues.length,
      highDensityZones: allZones.filter((z) => z.density > 80).length,
    };
  },

  // Direct refs for simulation engine (avoid copy overhead — simulation is read-heavy)
  _zones: zones,
  _queues: queues,
  _venue: venue,

  // Lifecycle
  init,
  isDBEnabled: () => DB_ENABLED,
};

module.exports = store;
