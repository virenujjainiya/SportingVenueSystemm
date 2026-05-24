/**
 * Supabase Client Singleton — Node 16 compatible
 *
 * Polyfills fetch + Headers for Node 16 which lacks them as globals.
 * Uses node-fetch (already a transitive dep) or the undici polyfill.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[DB] ⚠️  SUPABASE_URL or SUPABASE_KEY not set — will use in-memory fallback');
}

// ── Node 16 polyfill: inject fetch + Headers as globals ───────────────────
// Supabase JS v2 requires these to exist on globalThis
if (typeof globalThis.fetch === 'undefined') {
  try {
    const { fetch, Headers, Request, Response } = require('cross-fetch');
    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
    console.log('[DB] fetch polyfill applied (cross-fetch)');
  } catch {
    // cross-fetch not available — try node-fetch
    try {
      const nodeFetch = require('node-fetch');
      globalThis.fetch = nodeFetch.default || nodeFetch;
      globalThis.Headers = nodeFetch.Headers;
      globalThis.Request = nodeFetch.Request;
      globalThis.Response = nodeFetch.Response;
      console.log('[DB] fetch polyfill applied (node-fetch)');
    } catch {
      console.warn('[DB] No fetch polyfill available — Supabase may not work');
    }
  }
}

// Create client
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      global: {
        headers: { 'x-application-name': 'venueflow-backend' },
      },
    })
  : null;

module.exports = supabase;
