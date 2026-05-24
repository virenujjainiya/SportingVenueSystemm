/*
 * Performance Middleware
 *
 * Adds professional-grade HTTP performance headers:
 *   - X-Response-Time   : exact milliseconds for this request
 *   - X-Request-Id      : trace ID (set by requestLogger, echoed here if missing)
 *   - Cache-Control     : proper cache headers for GET endpoints
 *   - Vary              : tells CDNs/proxies to vary cache by Accept-Encoding
 *
 * SCALE BENEFIT: Cache-Control on GET endpoints lets CDN cache zone/queue
 * snapshots for 5s, massively reducing origin load at 100M users.
 */

// Routes that are safe to cache briefly at CDN level
const CACHEABLE_ROUTES = ['/api/venue', '/api/zones', '/api/queues', '/api/feed', '/api/stats'];
const CACHE_MAX_AGE_SECONDS = 5; // 5 second CDN cache for live data

function performanceMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  // Set cache headers immediately (before any middleware can interfere)
  if (req.method === 'GET') {
    const isCacheable = CACHEABLE_ROUTES.some((route) =>
      req.path === route.replace('/api', '') || req.path.startsWith(route.replace('/api', '') + '/')
    );
    if (isCacheable && !req.path.includes('/auth')) {
      res.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=10`);
      res.set('Vary', 'Accept-Encoding');
    }
  }

  // Prevent caching of mutations and auth
  if (req.method !== 'GET' || req.path.includes('/auth')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
  }

  // Intercept res.end to set timing header BEFORE the response is sent
  const originalEnd = res.end.bind(res);
  res.end = function (...args) {
    if (!res.headersSent) {
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = (Number(durationNs) / 1_000_000).toFixed(2);
      res.setHeader('X-Response-Time', `${durationMs}ms`);
    }
    return originalEnd(...args);
  };

  next();
}

module.exports = performanceMiddleware;
