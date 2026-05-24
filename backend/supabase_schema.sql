-- ================================================================
-- VenueFlow — Supabase Test Tables
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ================================================================

-- ── 1. VENUES TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'Football',
  capacity INTEGER NOT NULL DEFAULT 52000,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'halftime', 'ended')),
  home_team_name TEXT NOT NULL,
  home_team_short TEXT NOT NULL,
  home_team_score INTEGER DEFAULT 0,
  away_team_name TEXT NOT NULL,
  away_team_short TEXT NOT NULL,
  away_team_score INTEGER DEFAULT 0,
  match_clock TEXT DEFAULT '00:00',
  match_half INTEGER DEFAULT 1,
  weather_temp INTEGER DEFAULT 24,
  weather_condition TEXT DEFAULT 'Clear',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. ZONES TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('seating', 'concourse', 'gate', 'vip')),
  capacity INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  density INTEGER DEFAULT 0 CHECK (density >= 0 AND density <= 100),
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('rising', 'falling', 'stable')),
  pos_x INTEGER DEFAULT 0,
  pos_y INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. QUEUES TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queues (
  id TEXT PRIMARY KEY,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  zone_id TEXT REFERENCES zones(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('food', 'drink', 'merch', 'restroom')),
  icon TEXT DEFAULT '🍔',
  wait_minutes INTEGER DEFAULT 0,
  people_in_queue INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'busy', 'closed')),
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('growing', 'shrinking', 'stable')),
  pos_x INTEGER DEFAULT 0,
  pos_y INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 4. FEED TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('score', 'announcement', 'alert', 'milestone')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 5. ENABLE ROW LEVEL SECURITY ─────────────────────────────────
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed ENABLE ROW LEVEL SECURITY;

-- ── 6. RLS POLICIES — Allow public read access ──────────────────
CREATE POLICY "Public read venues" ON venues FOR SELECT USING (true);
CREATE POLICY "Public read zones" ON zones FOR SELECT USING (true);
CREATE POLICY "Public read queues" ON queues FOR SELECT USING (true);
CREATE POLICY "Public read feed" ON feed FOR SELECT USING (true);

-- Allow authenticated inserts (for admin/backend)
CREATE POLICY "Service insert venues" ON venues FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert zones" ON zones FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert queues" ON queues FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert feed" ON feed FOR INSERT WITH CHECK (true);

CREATE POLICY "Service update venues" ON venues FOR UPDATE USING (true);
CREATE POLICY "Service update zones" ON zones FOR UPDATE USING (true);
CREATE POLICY "Service update queues" ON queues FOR UPDATE USING (true);

-- ── 7. INDEXES FOR PERFORMANCE ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_zones_venue ON zones(venue_id);
CREATE INDEX IF NOT EXISTS idx_zones_density ON zones(density);
CREATE INDEX IF NOT EXISTS idx_queues_venue ON queues(venue_id);
CREATE INDEX IF NOT EXISTS idx_queues_type ON queues(type);
CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status);
CREATE INDEX IF NOT EXISTS idx_feed_venue ON feed(venue_id);
CREATE INDEX IF NOT EXISTS idx_feed_type ON feed(type);
CREATE INDEX IF NOT EXISTS idx_feed_created ON feed(created_at DESC);

-- ── 8. AUTO-UPDATE TIMESTAMP TRIGGER ─────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venues_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER zones_updated_at BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER queues_updated_at BEFORE UPDATE ON queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- 9. SEED TEST DATA
-- ================================================================

-- Insert test venue
INSERT INTO venues (id, name, sport, capacity, status, home_team_name, home_team_short, away_team_name, away_team_short)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'MetLife Grand Stadium',
  'Football',
  52000,
  'live',
  'Thunder FC',
  'THU',
  'Phoenix Rising',
  'PHX'
);

-- Insert test zones
INSERT INTO zones (id, venue_id, name, type, capacity, current_count, density, trend, pos_x, pos_y) VALUES
  ('zone-north',       'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'North Stand',      'seating',   8000, 4800, 60, 'stable',  50, 10),
  ('zone-south',       'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'South Stand',      'seating',   8000, 5600, 70, 'rising',  50, 90),
  ('zone-east',        'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'East Wing',        'seating',   7000, 3500, 50, 'stable',  90, 50),
  ('zone-west',        'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'West Wing',        'seating',   7000, 4200, 60, 'falling', 10, 50),
  ('zone-vip',         'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'VIP Lounge',       'vip',       2000, 1200, 60, 'stable',  50, 50),
  ('zone-concourse-n', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'North Concourse',  'concourse', 5000, 3000, 60, 'rising',  50, 25),
  ('zone-concourse-s', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'South Concourse',  'concourse', 5000, 2500, 50, 'stable',  50, 75),
  ('zone-gate-a',      'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Gate A Entry',     'gate',      3000, 900,  30, 'falling', 15, 15),
  ('zone-gate-b',      'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Gate B Entry',     'gate',      3000, 1200, 40, 'stable',  85, 15),
  ('zone-gate-c',      'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Gate C Entry',     'gate',      3000, 2100, 70, 'rising',  85, 85),
  ('zone-gate-d',      'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Gate D Entry',     'gate',      3000, 600,  20, 'falling', 15, 85);

-- Insert test queues
INSERT INTO queues (id, venue_id, zone_id, name, type, icon, wait_minutes, people_in_queue, status, trend, pos_x, pos_y) VALUES
  ('q-food-1',     'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-concourse-n', 'Burger & Fries Stand',  'food',     '🍔', 8,  24, 'open', 'growing',   35, 22),
  ('q-food-2',     'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-concourse-n', 'Pizza Corner',          'food',     '🍕', 5,  15, 'open', 'stable',    65, 22),
  ('q-food-3',     'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-concourse-s', 'Hot Dog Express',       'food',     '🌭', 3,  9,  'open', 'shrinking', 40, 78),
  ('q-food-4',     'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-concourse-s', 'Taco Station',          'food',     '🌮', 12, 36, 'busy', 'growing',   60, 78),
  ('q-drink-1',    'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-concourse-n', 'Craft Beer Bar',        'drink',    '🍺', 10, 30, 'open', 'stable',    50, 20),
  ('q-drink-2',    'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-concourse-s', 'Smoothie & Juice',      'drink',    '🥤', 4,  12, 'open', 'shrinking', 50, 80),
  ('q-merch-1',    'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-gate-a',      'Official Merch Store',  'merch',    '👕', 15, 45, 'busy', 'growing',   20, 18),
  ('q-merch-2',    'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-gate-c',      'Fan Zone Shop',         'merch',    '🧢', 7,  21, 'open', 'stable',    80, 82),
  ('q-restroom-1', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-concourse-n', 'Restroom North',        'restroom', '🚻', 6,  18, 'open', 'stable',    25, 28),
  ('q-restroom-2', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-concourse-s', 'Restroom South',        'restroom', '🚻', 3,  9,  'open', 'shrinking', 75, 72),
  ('q-restroom-3', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-east',        'Restroom East',         'restroom', '🚻', 2,  6,  'open', 'stable',    88, 45),
  ('q-restroom-4', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'zone-west',        'Restroom West',         'restroom', '🚻', 9,  27, 'open', 'growing',   12, 55);

-- Insert test feed items
INSERT INTO feed (venue_id, type, title, message, severity) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'announcement', 'Welcome!',    'Welcome to MetLife Grand Stadium! Enjoy the match.', 'info'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'announcement', 'Gates Open',  'All gates are now open. Find your seat using the venue map.', 'info'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'score',        'Kickoff!',    'The match has begun! Thunder FC vs Phoenix Rising.', 'info'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'score',        '⚡ GOAL!',   '[12:00] Thunder FC scores! What a strike!', 'warning'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'announcement', '🟡 Yellow Card', '[18:00] Yellow card shown to Phoenix Rising player.', 'info');

-- ================================================================
-- VERIFICATION: Check table counts
-- ================================================================
SELECT 'venues' AS table_name, COUNT(*) AS row_count FROM venues
UNION ALL
SELECT 'zones', COUNT(*) FROM zones
UNION ALL
SELECT 'queues', COUNT(*) FROM queues
UNION ALL
SELECT 'feed', COUNT(*) FROM feed;
