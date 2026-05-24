# 🔗 VenueFlow — Integration Contract

> **This file is the SINGLE SOURCE OF TRUTH for the API contract between frontend and backend.**
> Both developers MUST follow this contract exactly. Any changes require both developers to agree.

---

## Connection Details

| Service | URL | Protocol |
|---------|-----|----------|
| Backend API | `http://localhost:3001` | HTTP REST |
| WebSocket | `http://localhost:3001` | Socket.IO v4 |
| Frontend Dev | `http://localhost:5173` | HTTP (Vite) |

**CORS**: Backend allows origin `http://localhost:5173`.
**Proxy**: Vite proxies `/api/*` and `/socket.io/*` to backend, so frontend can use relative URLs for REST.

---

## REST API Contract

All responses follow this shape:
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }  // optional
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

---

### GET /api/venue

**Purpose**: Venue metadata + live match info
**Called by**: `useVenueData` hook on mount

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "venue-001",
    "name": "MetLife Grand Stadium",
    "sport": "Football",
    "capacity": 52000,
    "currentAttendance": 34200,
    "status": "live",
    "match": {
      "homeTeam": { "name": "Thunder FC", "shortName": "THU", "score": 2, "logo": "⚡" },
      "awayTeam": { "name": "Phoenix Rising", "shortName": "PHX", "score": 1, "logo": "🔥" },
      "clock": "34:00",
      "half": 1,
      "startTime": "2026-05-24T10:30:00.000Z"
    },
    "weather": { "temp": 24, "condition": "Clear", "icon": "☀️" }
  }
}
```

---

### GET /api/zones

**Purpose**: All stadium zones with crowd density
**Called by**: `useVenueData` hook on mount

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "zone-north",
      "name": "North Stand",
      "type": "seating",
      "capacity": 8000,
      "currentCount": 5600,
      "density": 70,
      "trend": "rising",
      "x": 50,
      "y": 10,
      "lastUpdated": "2026-05-24T10:35:00.000Z"
    }
  ],
  "meta": {
    "totalZones": 11,
    "avgDensity": 58,
    "highDensityCount": 2
  }
}
```

**Zone Types**: `"seating"` | `"concourse"` | `"gate"` | `"vip"`
**Trend Values**: `"rising"` | `"falling"` | `"stable"`
**Density**: Integer 0-100 (percentage)

---

### GET /api/zones/:id

**Purpose**: Single zone with nearby queues
**Called by**: `ZoneDetail` component (future)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "zone-north",
    "name": "North Stand",
    "...all zone fields...",
    "nearbyQueues": [
      { "id": "q-food-1", "name": "Burger & Fries", "waitMinutes": 5, "...etc" }
    ]
  }
}
```

---

### POST /api/zones/:id

**Purpose**: Admin update zone density
**Called by**: Admin dashboard

**Body**:
```json
{
  "density": 85,
  "currentCount": 6800
}
```

**Side effect**: Emits `zone:update` WebSocket event to all clients.

---

### GET /api/queues

**Purpose**: All queue points with wait times
**Called by**: `useVenueData` hook on mount

**Query params**:
- `?type=food` — Filter by type (`food` | `drink` | `merch` | `restroom`)
- `?status=open` — Filter by status

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "q-food-1",
      "name": "Burger & Fries Stand",
      "type": "food",
      "zone": "zone-concourse-n",
      "waitMinutes": 8,
      "peopleInQueue": 24,
      "status": "open",
      "trend": "growing",
      "x": 35,
      "y": 22,
      "icon": "🍔",
      "lastUpdated": "2026-05-24T10:35:00.000Z"
    }
  ],
  "meta": {
    "total": 12,
    "avgWaitMinutes": 7
  }
}
```

**Queue Types**: `"food"` | `"drink"` | `"merch"` | `"restroom"`
**Status Values**: `"open"` | `"busy"` | `"closed"`
**Trend Values**: `"growing"` | `"shrinking"` | `"stable"`

---

### GET /api/queues/recommend

**Purpose**: Smart queue recommendations (top 3 lowest-wait options)
**Called by**: `QueueBoard` component

**Query params**:
- `?type=food` — Filter recommendations by type (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "id": "q-food-2",
      "name": "Pizza Corner",
      "waitMinutes": 3,
      "score": 92,
      "recommendation": "Almost no wait! Head to Pizza Corner now.",
      "isBestChoice": true,
      "...all queue fields..."
    },
    { "rank": 2, "..." },
    { "rank": 3, "..." }
  ]
}
```

---

### POST /api/queues/:id

**Purpose**: Admin update queue wait time / status
**Called by**: Admin dashboard

**Body**:
```json
{
  "waitMinutes": 15,
  "status": "busy",
  "peopleInQueue": 45
}
```

**Side effect**: Emits `queue:update` WebSocket event.

---

### GET /api/feed

**Purpose**: Live event feed (scores, announcements, alerts)
**Called by**: `useVenueData` hook on mount

**Query params**:
- `?limit=30` — Number of items (default 50, max 100)
- `?type=score` — Filter by type

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "type": "score",
      "title": "⚡ GOAL!",
      "message": "[34:00] Thunder FC scores! What a strike!",
      "severity": "warning",
      "timestamp": "2026-05-24T10:34:00.000Z"
    }
  ],
  "meta": {
    "count": 15,
    "limit": 30
  }
}
```

**Feed Types**: `"score"` | `"announcement"` | `"alert"` | `"milestone"`
**Severity**: `"info"` | `"warning"` | `"critical"`

---

### POST /api/feed

**Purpose**: Admin post announcement/alert
**Called by**: `AdminPanel` component

**Body**:
```json
{
  "type": "announcement",
  "title": "Gate C Closing",
  "message": "Gate C will close in 10 minutes. Please use Gate A or Gate D.",
  "severity": "warning"
}
```

**Required fields**: `type`, `title`, `message`
**Optional fields**: `severity` (defaults to `"info"`)

**Side effects**:
- Emits `feed:new` WebSocket event to all clients
- If `severity === "critical"`, also emits `alert:broadcast`

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "type": "announcement",
    "title": "Gate C Closing",
    "message": "Gate C will close in 10 minutes...",
    "severity": "warning",
    "timestamp": "2026-05-24T10:40:00.000Z"
  }
}
```

---

### GET /api/stats

**Purpose**: Aggregate statistics for admin dashboard
**Called by**: `useVenueData` hook, `AdminPanel`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalAttendance": 34200,
    "avgDensity": 58,
    "avgWaitTime": 7,
    "openQueues": 10,
    "totalQueues": 12,
    "highDensityZones": 2
  }
}
```

---

### GET /health

**Purpose**: Server health check (no rate limit)

**Response**:
```json
{
  "status": "healthy",
  "uptime": 3600.5,
  "timestamp": "2026-05-24T10:30:00.000Z",
  "environment": "development"
}
```

---

## WebSocket Contract (Socket.IO v4)

### Connection

**Frontend connects to**: `http://localhost:3001`
**Transport**: WebSocket preferred, polling fallback
**Library**: `socket.io-client` v4

```javascript
// Frontend connection code
import { io } from 'socket.io-client';
const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  reconnection: true,
});
```

---

### Server → Client Events

#### `init:state`
**When**: Immediately after client connects
**Purpose**: Send full initial state to avoid separate REST calls
```json
{
  "venue": { "...venue object..." },
  "zones": [ "...array of zones..." ],
  "queues": [ "...array of queues..." ],
  "feed": [ "...last 20 feed items..." ],
  "stats": { "...stats object..." },
  "connectedClients": 42
}
```

#### `zone:update`
**When**: Every 5 seconds (simulation) or on admin update
**Purpose**: Single zone density changed
```json
{
  "id": "zone-north",
  "name": "North Stand",
  "type": "seating",
  "capacity": 8000,
  "currentCount": 5800,
  "density": 73,
  "trend": "rising",
  "x": 50,
  "y": 10,
  "lastUpdated": "2026-05-24T10:35:05.000Z"
}
```
**Frontend action**: Update matching zone in zones array by ID.

#### `queue:update`
**When**: Every 5 seconds (simulation) or on admin update
**Purpose**: Single queue wait time changed
```json
{
  "id": "q-food-1",
  "name": "Burger & Fries Stand",
  "type": "food",
  "waitMinutes": 10,
  "peopleInQueue": 30,
  "status": "busy",
  "trend": "growing",
  "...all queue fields..."
}
```
**Frontend action**: Update matching queue in queues array by ID.

#### `feed:new`
**When**: On match events (goals, cards) or admin posts
**Purpose**: New feed item to prepend to feed list
```json
{
  "id": "uuid-here",
  "type": "score",
  "title": "⚡ GOAL!",
  "message": "[34:00] Thunder FC scores!",
  "severity": "warning",
  "timestamp": "2026-05-24T10:34:00.000Z"
}
```
**Frontend action**: Prepend to feed array, keep max 100 items.

#### `alert:broadcast`
**When**: Critical alerts or goals
**Purpose**: Trigger a toast notification overlay
```json
{
  "severity": "warning",
  "title": "⚡ GOAL!",
  "message": "[34:00] Thunder FC scores!",
  "score": { "home": 2, "away": 1 },
  "timestamp": "2026-05-24T10:34:00.000Z"
}
```
**Frontend action**: Show floating toast notification.

#### `venue:clock`
**When**: Every 5 seconds
**Purpose**: Match clock and score update
```json
{
  "clock": "34:00",
  "half": 1,
  "status": "live",
  "score": {
    "home": { "name": "THU", "score": 2 },
    "away": { "name": "PHX", "score": 1 }
  }
}
```
**Frontend action**: Update header score display and clock.

#### `stats:connections`
**When**: Every 10 seconds
**Purpose**: Connected client count
```json
{ "connectedClients": 42 }
```

---

### Client → Server Events

#### `zone:checkin`
**When**: User taps a zone on the map
**Purpose**: Join Socket.IO room for zone-specific updates
```json
{ "zoneId": "zone-north" }
```

#### `request:refresh`
**When**: User pulls to refresh or manually requests
**Purpose**: Request full state re-send (triggers `init:state` response)
```json
{}
```

#### `admin:updateScore`
**When**: Admin adjusts score
**Purpose**: Update match score
```json
{ "home": 2, "away": 1 }
```
**Server action**: Updates venue data, emits `feed:new` and `venue:clock`.

---

## Zone IDs Reference

Both frontend SVG map and backend data store MUST use these exact IDs:

| ID | Name | Type |
|----|------|------|
| `zone-north` | North Stand | seating |
| `zone-south` | South Stand | seating |
| `zone-east` | East Wing | seating |
| `zone-west` | West Wing | seating |
| `zone-vip` | VIP Lounge | vip |
| `zone-concourse-n` | North Concourse | concourse |
| `zone-concourse-s` | South Concourse | concourse |
| `zone-gate-a` | Gate A Entry | gate |
| `zone-gate-b` | Gate B Entry | gate |
| `zone-gate-c` | Gate C Entry | gate |
| `zone-gate-d` | Gate D Entry | gate |

---

## Queue IDs Reference

| ID | Name | Type | Zone |
|----|------|------|------|
| `q-food-1` | Burger & Fries Stand | food | zone-concourse-n |
| `q-food-2` | Pizza Corner | food | zone-concourse-n |
| `q-food-3` | Hot Dog Express | food | zone-concourse-s |
| `q-food-4` | Taco Station | food | zone-concourse-s |
| `q-drink-1` | Craft Beer Bar | drink | zone-concourse-n |
| `q-drink-2` | Smoothie & Juice | drink | zone-concourse-s |
| `q-merch-1` | Official Merch Store | merch | zone-gate-a |
| `q-merch-2` | Fan Zone Shop | merch | zone-gate-c |
| `q-restroom-1` | Restroom North | restroom | zone-concourse-n |
| `q-restroom-2` | Restroom South | restroom | zone-concourse-s |
| `q-restroom-3` | Restroom East | restroom | zone-east |
| `q-restroom-4` | Restroom West | restroom | zone-west |

---

## Git Workflow

```
main
 ├── dev-1/backend    ← Developer 1 works here
 └── dev-2/frontend   ← Developer 2 works here
```

1. Each developer creates their branch from `main`
2. Work stays in separate folders — zero merge conflicts
3. Push frequently for visibility
4. Merge both branches to `main` during Phase 3 (Integration)
5. If API contract changes, update this file FIRST, then both devs adapt

---

## Troubleshooting Integration

| Symptom | Cause | Fix |
|---------|-------|-----|
| Frontend gets 404 on `/api/*` | Backend not running | Start backend on port 3001 |
| CORS error in browser | Origin mismatch | Set `CORS_ORIGIN=http://localhost:5173` in backend `.env` |
| Socket.IO connection fails | Wrong URL or port | Frontend must connect to `http://localhost:3001` directly (not through Vite proxy for WS) |
| Zone data doesn't match map | ID mismatch | Cross-reference Zone IDs table above |
| Stale data after reconnect | No `init:state` received | Backend should send `init:state` on every new connection |
| Feed items not appearing | Event name mismatch | Must be exactly `feed:new` (not `feed:update` or `feed:add`) |
| Score not updating in header | Wrong event | Use `venue:clock` event, not `venue:update` |
