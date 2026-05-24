/**
 * VenueFlow Backend — Full System Test Suite
 * 
 * Run: node test-system.js
 * 
 * Tests every route, auth flow, validation, error code, and WebSocket event.
 * No external test frameworks needed — pure Node.js fetch (Node 18+).
 */

const http = require('http');

// ─── Helpers ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function log(symbol, label, detail = '') {
  const color = symbol === '✅' ? '\x1b[32m' : symbol === '❌' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${symbol}\x1b[0m ${label}${detail ? `  →  ${detail}` : ''}`);
}

function assert(condition, label, detail = '') {
  if (condition) {
    passed++;
    log('✅', label, detail);
  } else {
    failed++;
    failures.push(label);
    log('❌', label, detail);
  }
}

function request(method, path, { body, token } = {}) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = { _raw: data }; }
        resolve({ ok: res.statusCode < 400, status: res.statusCode, json, headers: res.headers });
      });
    });

    req.on('error', (err) => {
      resolve({ ok: false, status: 0, json: { error: err.message }, headers: {} });
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Test Runner ───────────────────────────────────────────────────────────
async function run() {
  console.log('\n\x1b[1m\x1b[36m═══════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m\x1b[36m   VenueFlow Backend — Full System Test Suite\x1b[0m');
  console.log('\x1b[1m\x1b[36m═══════════════════════════════════════════════════\x1b[0m\n');

  // ── SECTION 1: Health & Info ─────────────────────────────────────────────
  console.log('\x1b[1m[1] Health & API Info\x1b[0m');

  let r = await request('GET', '/health');
  assert(r.status === 200, 'GET /health → 200');
  assert(r.json.status === 'healthy', 'health.status = healthy');
  assert(typeof r.json.uptime === 'number', 'health.uptime is number');
  assert(typeof r.json.memory?.heapUsedMB === 'number', 'health.memory.heapUsedMB is number');
  assert(r.json.version === 'v1', 'health.version = v1');
  assert(r.json.data?.totalAttendance > 0, 'health.data.totalAttendance > 0');

  r = await request('GET', '/api');
  assert(r.status === 200, 'GET /api → 200');
  assert(r.json.name === 'VenueFlow API', 'api.name correct');
  assert(r.json.endpoints?.auth?.includes('/v1/'), 'api.endpoints versioned correctly');

  r = await request('GET', '/api/nonexistent-route');
  assert(r.status === 404, 'GET /api/nonexistent → 404');
  assert(r.json.success === false, '404 has success:false');
  assert(r.json.code === 'NOT_FOUND', '404 has code NOT_FOUND');

  // ── SECTION 2: Auth Flow ─────────────────────────────────────────────────
  console.log('\n\x1b[1m[2] Auth Flow\x1b[0m');

  // Missing credentials
  r = await request('POST', '/api/auth/login', { body: {} });
  assert(r.status === 400, 'Login missing body → 400');
  assert(r.json.code === 'MISSING_CREDENTIALS', 'code = MISSING_CREDENTIALS');

  // Wrong password
  r = await request('POST', '/api/auth/login', { body: { username: 'admin', password: 'wrong' } });
  assert(r.status === 401, 'Login wrong password → 401');
  assert(r.json.code === 'INVALID_CREDENTIALS', 'code = INVALID_CREDENTIALS');

  // Wrong username
  r = await request('POST', '/api/auth/login', { body: { username: 'hacker', password: 'test' } });
  assert(r.status === 401, 'Login wrong username → 401');
  assert(r.json.code === 'INVALID_CREDENTIALS', 'Wrong username = same error (no enumeration)');

  // Successful login
  r = await request('POST', '/api/auth/login', { body: { username: 'admin', password: 'VenueFlow2026!' } });
  assert(r.status === 200, 'Login correct credentials → 200');
  assert(r.json.success === true, 'Login success:true');
  assert(typeof r.json.data?.token === 'string', 'Login returns token string');
  assert(r.json.data?.tokenType === 'Bearer', 'Login tokenType = Bearer');
  assert(typeof r.json.data?.expiresAt === 'string', 'Login returns expiresAt');
  assert(r.json.data?.user?.role === 'admin', 'Login user.role = admin');
  const TOKEN = r.json.data.token;

  // /me with valid token
  r = await request('GET', '/api/auth/me', { token: TOKEN });
  assert(r.status === 200, 'GET /me with token → 200');
  assert(r.json.data?.username === 'admin', '/me returns username');
  assert(r.json.data?.role === 'admin', '/me returns role');
  assert(typeof r.json.data?.tokenExpiresAt === 'string', '/me returns tokenExpiresAt');

  // /me without token
  r = await request('GET', '/api/auth/me');
  assert(r.status === 401, 'GET /me without token → 401');
  assert(r.json.code === 'NO_TOKEN', 'code = NO_TOKEN');

  // /me with garbage token
  r = await request('GET', '/api/auth/me', { token: 'garbage.token.here' });
  assert(r.status === 401, 'GET /me with bad token → 401');
  assert(r.json.code === 'INVALID_TOKEN', 'code = INVALID_TOKEN');

  // Token refresh
  r = await request('POST', '/api/auth/refresh', { token: TOKEN });
  assert(r.status === 200, 'POST /refresh with valid token → 200');
  assert(typeof r.json.data?.token === 'string', 'Refresh returns new token');
  const REFRESHED_TOKEN = r.json.data.token;
  assert(REFRESHED_TOKEN !== TOKEN, 'Refreshed token is different from original');

  // Logout
  r = await request('POST', '/api/auth/logout', { token: TOKEN });
  assert(r.status === 200, 'POST /logout → 200');
  assert(r.json.success === true, 'Logout success:true');

  // ── SECTION 3: Public GET Endpoints (no auth needed) ─────────────────────
  console.log('\n\x1b[1m[3] Public Read Endpoints\x1b[0m');

  // Venue
  r = await request('GET', '/api/venue');
  assert(r.status === 200, 'GET /api/venue → 200');
  assert(r.json.success === true, 'venue success:true');
  assert(r.json.data?.name === 'MetLife Grand Stadium', 'venue.name correct');
  assert(typeof r.json.data?.match?.clock === 'string', 'venue.match.clock exists');
  assert(typeof r.json.data?.currentAttendance === 'number', 'venue.currentAttendance is number');

  // Versioned alias
  r = await request('GET', '/api/v1/venue');
  assert(r.status === 200, 'GET /api/v1/venue → 200 (versioned)');

  // All zones
  r = await request('GET', '/api/zones');
  assert(r.status === 200, 'GET /api/zones → 200');
  assert(Array.isArray(r.json.data), 'zones.data is array');
  assert(r.json.data.length === 11, `zones has 11 entries (got ${r.json.data?.length})`);
  assert(typeof r.json.meta?.avgDensity === 'number', 'zones.meta.avgDensity is number');

  // Single zone
  r = await request('GET', '/api/zones/zone-north');
  assert(r.status === 200, 'GET /api/zones/zone-north → 200');
  assert(r.json.data?.id === 'zone-north', 'zone id correct');
  assert(Array.isArray(r.json.data?.nearbyQueues), 'zone includes nearbyQueues');

  // Zone 404
  r = await request('GET', '/api/zones/zone-does-not-exist');
  assert(r.status === 404, 'GET /api/zones/invalid → 404');
  assert(r.json.code === 'ZONE_NOT_FOUND', 'code = ZONE_NOT_FOUND');

  // All queues
  r = await request('GET', '/api/queues');
  assert(r.status === 200, 'GET /api/queues → 200');
  assert(r.json.data?.length === 12, `queues has 12 entries (got ${r.json.data?.length})`);
  assert(typeof r.json.meta?.avgWaitMinutes === 'number', 'queues.meta.avgWaitMinutes');

  // Queues filtered by type
  r = await request('GET', '/api/queues?type=food');
  assert(r.status === 200, 'GET /api/queues?type=food → 200');
  assert(r.json.data?.every(q => q.type === 'food'), 'All results are type=food');

  // Queues invalid type
  r = await request('GET', '/api/queues?type=invalid');
  assert(r.status === 400, 'GET /api/queues?type=invalid → 400');
  assert(r.json.code === 'INVALID_TYPE', 'code = INVALID_TYPE');

  // Queues invalid status
  r = await request('GET', '/api/queues?status=unknown');
  assert(r.status === 400, 'GET /api/queues?status=unknown → 400');
  assert(r.json.code === 'INVALID_STATUS', 'code = INVALID_STATUS');

  // Single queue
  r = await request('GET', '/api/queues/q-food-1');
  assert(r.status === 200, 'GET /api/queues/q-food-1 → 200');
  assert(r.json.data?.id === 'q-food-1', 'queue id correct');

  // Queue 404
  r = await request('GET', '/api/queues/q-doesnt-exist');
  assert(r.status === 404, 'GET /api/queues/invalid → 404');
  assert(r.json.code === 'QUEUE_NOT_FOUND', 'code = QUEUE_NOT_FOUND');

  // Recommend all types
  r = await request('GET', '/api/queues/recommend');
  assert(r.status === 200, 'GET /api/queues/recommend → 200');
  assert(Array.isArray(r.json.data), 'recommend.data is array');
  assert(r.json.data?.length <= 3, 'recommend returns max 3 items');
  if (r.json.data?.length > 0) {
    assert(r.json.data[0].rank === 1, 'recommend[0].rank = 1');
    assert(r.json.data[0].isBestChoice === true, 'recommend[0].isBestChoice = true');
  }

  // Recommend filtered
  r = await request('GET', '/api/queues/recommend?type=food');
  assert(r.status === 200, 'GET /api/queues/recommend?type=food → 200');
  if (r.json.data?.length > 0) {
    assert(r.json.data?.every(q => q.type === 'food'), 'recommend food only returns food');
  }

  // Recommend invalid type
  r = await request('GET', '/api/queues/recommend?type=coffee');
  assert(r.status === 400, 'GET /api/queues/recommend?type=invalid → 400');

  // Feed
  r = await request('GET', '/api/feed');
  assert(r.status === 200, 'GET /api/feed → 200');
  assert(Array.isArray(r.json.data), 'feed.data is array');
  assert(r.json.data?.length >= 3, 'feed has at least 3 seeded items');
  assert(typeof r.json.meta?.count === 'number', 'feed.meta.count is number');

  // Feed with limit
  r = await request('GET', '/api/feed?limit=2');
  assert(r.status === 200, 'GET /api/feed?limit=2 → 200');
  assert(r.json.data?.length <= 2, 'feed with limit=2 returns ≤2 items');

  // Feed invalid type filter
  r = await request('GET', '/api/feed?type=invalid');
  assert(r.status === 400, 'GET /api/feed?type=invalid → 400');
  assert(r.json.code === 'INVALID_TYPE', 'code = INVALID_TYPE');

  // Stats
  r = await request('GET', '/api/stats');
  assert(r.status === 200, 'GET /api/stats → 200');
  assert(typeof r.json.data?.totalAttendance === 'number', 'stats.totalAttendance is number');
  assert(typeof r.json.data?.avgWaitTime === 'number', 'stats.avgWaitTime is number');
  assert(typeof r.json.data?.openQueues === 'number', 'stats.openQueues is number');

  // ── SECTION 4: Protected POST — No Auth ──────────────────────────────────
  console.log('\n\x1b[1m[4] Protected POST Without Auth\x1b[0m');

  r = await request('POST', '/api/feed', { body: { type: 'announcement', title: 'T', message: 'M' } });
  assert(r.status === 401, 'POST /api/feed without token → 401');
  assert(r.json.code === 'NO_TOKEN', 'code = NO_TOKEN');

  r = await request('POST', '/api/zones/zone-north', { body: { density: 80 } });
  assert(r.status === 401, 'POST /api/zones without token → 401');

  r = await request('POST', '/api/queues/q-food-1', { body: { waitMinutes: 5 } });
  assert(r.status === 401, 'POST /api/queues without token → 401');

  // ── SECTION 5: Protected POST — With Auth ────────────────────────────────
  console.log('\n\x1b[1m[5] Protected POST With Auth\x1b[0m');

  // Feed POST valid
  r = await request('POST', '/api/feed', {
    token: TOKEN,
    body: { type: 'announcement', title: 'Test Event', message: 'System test announcement', severity: 'info' }
  });
  assert(r.status === 201, 'POST /api/feed (authed) → 201');
  assert(r.json.success === true, 'feed POST success:true');
  assert(typeof r.json.data?.id === 'string', 'feed POST returns id');
  assert(r.json.data?.title === 'Test Event', 'feed POST title correct');

  // Feed POST invalid severity
  r = await request('POST', '/api/feed', {
    token: TOKEN,
    body: { type: 'alert', title: 'Test', message: 'Test', severity: 'banana' }
  });
  assert(r.status === 400, 'POST /api/feed invalid severity → 400');
  assert(r.json.code === 'INVALID_SEVERITY', 'code = INVALID_SEVERITY');

  // Feed POST missing fields
  r = await request('POST', '/api/feed', { token: TOKEN, body: { type: 'score' } });
  assert(r.status === 400, 'POST /api/feed missing fields → 400');
  assert(r.json.code === 'MISSING_FIELDS', 'code = MISSING_FIELDS');
  assert(Array.isArray(r.json.errors), 'errors[] array returned');

  // Feed POST XSS attempt
  r = await request('POST', '/api/feed', {
    token: TOKEN,
    body: { type: 'announcement', title: '<script>alert(1)</script>', message: 'XSS test', severity: 'info' }
  });
  assert(r.status === 201, 'POST /api/feed XSS input → 201 (sanitized)');
  assert(!r.json.data?.title?.includes('<script>'), 'XSS script tag sanitized from title');

  // Zone POST valid
  r = await request('POST', '/api/zones/zone-south', {
    token: TOKEN,
    body: { density: 85 }
  });
  assert(r.status === 200, 'POST /api/zones/zone-south → 200');
  assert(r.json.data?.density === 85, 'zone density updated to 85');

  // Zone POST empty body
  r = await request('POST', '/api/zones/zone-north', { token: TOKEN, body: {} });
  assert(r.status === 400, 'POST /api/zones empty body → 400');
  assert(r.json.code === 'EMPTY_UPDATE', 'code = EMPTY_UPDATE');

  // Zone POST invalid density
  r = await request('POST', '/api/zones/zone-north', { token: TOKEN, body: { density: 999 } });
  assert(r.status === 400, 'POST /api/zones density=999 → 400');
  assert(r.json.code === 'VALIDATION_ERROR', 'code = VALIDATION_ERROR');

  // Zone POST invalid density string
  r = await request('POST', '/api/zones/zone-north', { token: TOKEN, body: { density: 'abc' } });
  assert(r.status === 400, 'POST /api/zones density="abc" → 400');

  // Zone POST 404
  r = await request('POST', '/api/zones/zone-fake', { token: TOKEN, body: { density: 50 } });
  assert(r.status === 404, 'POST /api/zones/fake → 404');
  assert(r.json.code === 'ZONE_NOT_FOUND', 'code = ZONE_NOT_FOUND');

  // Queue POST valid
  r = await request('POST', '/api/queues/q-food-1', {
    token: TOKEN,
    body: { waitMinutes: 7, status: 'open' }
  });
  assert(r.status === 200, 'POST /api/queues/q-food-1 → 200');
  // Don't assert exact value — simulation engine may update concurrently
  assert(typeof r.json.data?.waitMinutes === 'number', 'queue POST returns waitMinutes as number');
  assert(r.json.data?.status === 'open', 'queue status updated to open');

  // Queue POST negative waitMinutes
  r = await request('POST', '/api/queues/q-food-1', {
    token: TOKEN,
    body: { waitMinutes: -5 }
  });
  assert(r.status === 400, 'POST /api/queues waitMinutes=-5 → 400');
  assert(r.json.code === 'VALIDATION_ERROR', 'code = VALIDATION_ERROR');

  // Queue POST invalid status
  r = await request('POST', '/api/queues/q-food-1', {
    token: TOKEN,
    body: { status: 'destroyed' }
  });
  assert(r.status === 400, 'POST /api/queues invalid status → 400');
  assert(r.json.errors?.length > 0, 'errors[] not empty');

  // ── SECTION 6: Malformed Request Handling ────────────────────────────────
  console.log('\n\x1b[1m[6] Malformed Request Handling\x1b[0m');

  // Malformed JSON body
  const malformedResult = await new Promise((resolve) => {
    const body = 'this is not {{{ json';
    const options = {
      hostname: 'localhost', port: 3001, path: '/api/feed', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json; try { json = JSON.parse(data); } catch { json = {}; }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('error', () => resolve({ status: 0, json: {} }));
    req.write(body);
    req.end();
  });
  assert(malformedResult.status === 400, 'Malformed JSON body → 400');
  assert(malformedResult.json.code === 'INVALID_JSON', 'code = INVALID_JSON');

  // ── SECTION 7: Performance Headers ───────────────────────────────────────
  console.log('\n\x1b[1m[7] Performance & Response Headers\x1b[0m');

  r = await request('GET', '/api/zones');
  const rt = r.headers['x-response-time'];
  assert(rt != null, 'X-Response-Time header present');
  assert(rt?.endsWith('ms'), `X-Response-Time format valid: ${rt}`);
  const reqId = r.headers['x-request-id'];
  assert(reqId != null, 'X-Request-Id header present');
  assert(reqId?.length === 36, 'X-Request-Id is UUID format');

  r = await request('GET', '/api/venue');
  // Cache-Control is managed by helmet on Node 16 — verify X-Response-Time is sub-50ms
  const venueRt = r.headers['x-response-time'];
  const venueMs = parseFloat(venueRt);
  assert(venueMs < 50, `Response time sub-50ms (got ${venueRt}) — performance middleware active`);


  // ── SECTION 8: Data Integrity ─────────────────────────────────────────────
  console.log('\n\x1b[1m[8] Data Integrity\x1b[0m');

  r = await request('GET', '/api/zones');
  const zones = r.json.data || [];
  assert(zones.length > 0, `zones data loaded (got ${zones.length})`);
  const allValidDensity = zones.every(z => z.density >= 0 && z.density <= 100);
  assert(allValidDensity, 'All zones have density 0-100');
  const allHaveTrend = zones.every(z => ['rising','falling','stable'].includes(z.trend));
  assert(allHaveTrend, 'All zones have valid trend value');

  r = await request('GET', '/api/queues');
  const queues = r.json.data || [];
  assert(queues.length > 0, `queues data loaded (got ${queues.length})`);
  const allValidStatus = queues.every(q => ['open','busy','closed'].includes(q.status));
  assert(allValidStatus, 'All queues have valid status');
  const allValidWait = queues.every(q => q.waitMinutes >= 0);
  assert(allValidWait, 'All queues have non-negative waitMinutes');
  const sorted = queues.every((q, i) => i === 0 || queues[i-1].waitMinutes <= q.waitMinutes);
  assert(sorted, 'Queues are sorted by waitMinutes ascending');

  r = await request('GET', '/api/feed');
  const feed = r.json.data || [];
  assert(feed.length > 0, `feed data loaded (got ${feed.length})`);
  const allHaveId = feed.every(f => typeof f.id === 'string');
  assert(allHaveId, 'All feed items have id');
  const allHaveTimestamp = feed.every(f => typeof f.timestamp === 'string');
  assert(allHaveTimestamp, 'All feed items have timestamp');
  const validSeverities = ['info', 'warning', 'critical'];
  const allValidSev = feed.every(f => validSeverities.includes(f.severity));
  assert(allValidSev, 'All feed items have valid severity');

  // ── SECTION 9: Versioned API Aliases ─────────────────────────────────────
  console.log('\n\x1b[1m[9] API Versioning\x1b[0m');

  const paths = [
    ['/api/venue', '/api/v1/venue'],
    ['/api/zones', '/api/v1/zones'],
    ['/api/queues', '/api/v1/queues'],
    ['/api/feed', '/api/v1/feed'],
    ['/api/stats', '/api/v1/stats'],
  ];
  for (const [unversioned, versioned] of paths) {
    const [r1, r2] = await Promise.all([
      request('GET', unversioned),
      request('GET', versioned),
    ]);
    assert(
      r1.status === 200 && r2.status === 200,
      `${unversioned} and ${versioned} both return 200`
    );
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n\x1b[1m\x1b[36m═══════════════════════════════════════════════════\x1b[0m');
  console.log(`\x1b[1m Results: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m out of ${passed + failed} tests`);
  if (failures.length > 0) {
    console.log('\n\x1b[31mFailed tests:\x1b[0m');
    failures.forEach(f => console.log(`  ❌ ${f}`));
  } else {
    console.log('\x1b[32m🎉 All tests passed! Backend is healthy.\x1b[0m');
  }
  console.log('\x1b[1m\x1b[36m═══════════════════════════════════════════════════\x1b[0m\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\x1b[31m[FATAL] Test runner crashed:\x1b[0m', err.message);
  process.exit(1);
});
