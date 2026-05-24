/*
 * Simulation Engine
 *
 * Purpose: Generate realistic real-time data for demo purposes.
 * Runs on a configurable interval (default 5 seconds).
 *
 * Simulates:
 * 1. Crowd density changes per zone (gradual, realistic movement)
 * 2. Queue wait time fluctuations
 * 3. Periodic score updates and event milestones
 * 4. Match clock progression
 *
 * SCALE NOTE: In production, this is replaced by real sensor/IoT data
 * ingestion via a message queue (Kafka/RabbitMQ).
 */

const store = require('../data/store');
const { clamp, randomInt, randomFloat, randomPick } = require('../utils/helpers');

let simulationTimer = null;
let matchClockTimer = null;
let matchSeconds = 0;
let io = null;

// Score event templates
const scoreEvents = [
  { title: '⚡ GOAL!', msgTemplate: (team) => `${team} scores! What a strike!` },
  { title: '🟡 Yellow Card', msgTemplate: (team) => `Yellow card shown to ${team} player.` },
  { title: '🔴 Red Card', msgTemplate: (team) => `Red card! ${team} player sent off!` },
  { title: '⚽ Corner Kick', msgTemplate: (team) => `Corner kick for ${team}.` },
  { title: '🥅 Free Kick', msgTemplate: (team) => `Free kick awarded to ${team}.` },
  { title: '🔄 Substitution', msgTemplate: (team) => `${team} makes a substitution.` },
];

const milestoneEvents = [
  { title: '🎉 Half Time', message: 'The first half has ended. Grab some food!', type: 'milestone' },
  { title: '🔔 10 Minutes Left', message: 'Just 10 minutes remaining in the match!', type: 'milestone' },
  { title: '⏱️ Added Time', message: '3 minutes of added time!', type: 'milestone' },
];

function simulateZones() {
  const zones = store._zones;

  zones.forEach((zone, id) => {
    // Simulate gradual density changes (-5% to +5%)
    const change = randomFloat(-5, 5);
    const newDensity = clamp(Math.round(zone.density + change), 5, 98);
    const newCount = Math.round((newDensity / 100) * zone.capacity);

    // Determine trend
    let trend = 'stable';
    if (newDensity > zone.density + 2) trend = 'rising';
    else if (newDensity < zone.density - 2) trend = 'falling';

    zone.density = newDensity;
    zone.currentCount = newCount;
    zone.trend = trend;
    zone.lastUpdated = new Date().toISOString();

    // Emit update
    if (io) {
      io.emit('zone:update', { ...zone });
    }
  });
}

function simulateQueues() {
  const queuesMap = store._queues;

  queuesMap.forEach((queue, id) => {
    if (queue.status === 'closed') return;

    // Simulate wait time changes (-2 to +3 minutes)
    const change = randomFloat(-2, 3);
    const newWait = clamp(Math.round(queue.waitMinutes + change), 1, 25);
    const newPeople = newWait * randomInt(2, 4);

    // Determine trend
    let trend = 'stable';
    if (newWait > queue.waitMinutes + 1) trend = 'growing';
    else if (newWait < queue.waitMinutes - 1) trend = 'shrinking';

    // Occasionally change status
    if (newWait > 15) queue.status = 'busy';
    else queue.status = 'open';

    queue.waitMinutes = newWait;
    queue.peopleInQueue = newPeople;
    queue.trend = trend;
    queue.lastUpdated = new Date().toISOString();

    if (io) {
      io.emit('queue:update', { ...queue });
    }
  });
}

function simulateMatchEvents() {
  const venue = store._venue;

  // Don't generate match events during halftime or after match ended
  if (venue.status === 'halftime' || venue.status === 'ended') return;

  // 10% chance of a match event each cycle
  if (Math.random() > 0.10) return;

  const event = randomPick(scoreEvents);
  const isHome = Math.random() > 0.5;
  const team = isHome ? venue.match.homeTeam.name : venue.match.awayTeam.name;

  // If it's a goal, update score
  if (event.title.includes('GOAL')) {
    if (isHome) venue.match.homeTeam.score++;
    else venue.match.awayTeam.score++;
  }

  const feedItem = store.addFeedItem({
    type: event.title.includes('GOAL') ? 'score' : 'announcement',
    title: event.title,
    message: `[${venue.match.clock}] ${event.msgTemplate(team)}`,
    severity: event.title.includes('GOAL') ? 'warning' : 'info',
  });

  if (io) {
    io.emit('feed:new', feedItem);
    // Goals get special broadcast
    if (event.title.includes('GOAL')) {
      io.emit('alert:broadcast', {
        severity: 'warning',
        title: event.title,
        message: feedItem.message,
        score: {
          home: venue.match.homeTeam.score,
          away: venue.match.awayTeam.score,
        },
        timestamp: feedItem.timestamp,
      });
    }
  }
}

function updateMatchClock() {
  const venue = store._venue;
  matchSeconds += 1;
  // Speed up: 1 real second = 1 match minute for demo purposes
  const minutes = Math.floor(matchSeconds);
  const secs = 0;
  venue.match.clock = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Half time at 45 minutes
  if (minutes === 45 && venue.match.half === 1) {
    venue.match.half = 2;
    venue.status = 'halftime';
    const item = store.addFeedItem({
      type: 'milestone',
      title: '🎉 Half Time',
      message: `Half time! Score: ${venue.match.homeTeam.name} ${venue.match.homeTeam.score} - ${venue.match.awayTeam.score} ${venue.match.awayTeam.name}`,
      severity: 'info',
    });
    if (io) io.emit('feed:new', item);
  }

  // Second half starts at 46
  if (minutes === 46) {
    venue.status = 'live';
  }

  // Full time at 90
  if (minutes >= 90) {
    venue.status = 'ended';
    matchSeconds = 90;
  }

  // Broadcast clock update every 5 seconds
  if (matchSeconds % 5 === 0 && io) {
    io.emit('venue:clock', {
      clock: venue.match.clock,
      half: venue.match.half,
      status: venue.status,
      score: {
        home: { name: venue.match.homeTeam.shortName, score: venue.match.homeTeam.score },
        away: { name: venue.match.awayTeam.shortName, score: venue.match.awayTeam.score },
      },
    });
  }
}

function start(socketIo, intervalMs = 5000) {
  io = socketIo;
  console.log(`[SIMULATION] Starting engine (interval: ${intervalMs}ms)`);

  // Main simulation loop
  simulationTimer = setInterval(() => {
    simulateZones();
    simulateQueues();
    simulateMatchEvents();
  }, intervalMs);

  // Match clock ticks every second
  matchClockTimer = setInterval(updateMatchClock, 1000);

  return { stop };
}

function stop() {
  if (simulationTimer) clearInterval(simulationTimer);
  if (matchClockTimer) clearInterval(matchClockTimer);
  console.log('[SIMULATION] Engine stopped');
}

module.exports = { start, stop };
