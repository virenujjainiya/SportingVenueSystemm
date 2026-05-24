# 🏟️ VenueFlow — Smart Sporting Venue Companion

> **Goal**: Build a real-time web app that improves the physical event experience for attendees at large-scale sporting venues — tackling crowd movement, waiting times, and real-time coordination.

## Problem Analysis

| Challenge | Pain Point | Our Solution |
|-----------|-----------|--------------|
| **Crowd Movement** | Attendees don't know which gates/paths are congested | Live crowd density heatmap with zone indicators |
| **Waiting Times** | Long unpredictable queues at food/merch/restrooms | Real-time queue status + smart recommendations |
| **Real-time Coordination** | No unified info source during event | Live event feed with alerts, scores, and announcements |
| **Navigation** | Large venues are confusing to navigate | Interactive venue map with point-of-interest markers |
| **Engagement** | Passive experience between plays | Live stats, polls, and event timeline |

---

## 💡 Solution: "VenueFlow"

A **mobile-first web application** (no app store needed — works in browser) with two views:

### 1. Attendee App (Mobile Web)
- **Interactive Venue Map** — SVG-based stadium map with color-coded zones showing crowd density
- **Live Queue Board** — Real-time wait times for all concession stands, restrooms, merch shops
- **Smart Recommendations** — "Go to Stand B3 — only 2 min wait vs 12 min at Stand A1"
- **Live Event Feed** — Score updates, announcements, emergency alerts
- **My Ticket / Seat Finder** — Quick access to seat info and nearest amenities

### 2. Admin Dashboard (Desktop)
- **Venue Overview** — Bird's-eye crowd density heatmap
- **Queue Management** — Update wait times, open/close stands
- **Broadcast Alerts** — Push announcements to all attendees
- **Analytics** — Real-time attendee flow statistics

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Vite + React | Fast dev, hot reload, component-based |
| **Styling** | Vanilla CSS with CSS Custom Properties | Full control, premium design |
| **Backend** | Node.js + Express | Fast to build, JS everywhere |
| **Real-time** | Socket.IO (WebSockets) | Live updates for queues, alerts, density |
| **Data** | In-memory store (no DB needed) | 3-hour scope, mock data simulation |
| **Monorepo** | Single repo, `/client` + `/server` folders | Easy integration |

---

## 👥 Developer Task Split

### Developer 1: **Backend + Real-time Engine**
Owns: `/server`, API contracts, WebSocket events, data simulation

### Developer 2: **Frontend + UX**
Owns: `/client`, all UI components, venue map, animations

### Shared Contract (Defined FIRST — minute 0-15)
Both developers agree on the API contract before splitting. This is the **integration layer**.

---

## 📋 API Contract (Shared Agreement)

> [!IMPORTANT]
> Both developers must agree on this contract in the first 15 minutes. This is what enables parallel work without merge conflicts.

### REST Endpoints

```
GET  /api/venue          → Venue metadata (name, zones, capacity)
GET  /api/zones          → All zones with current crowd density (0-100%)
GET  /api/queues         → All queue points with wait times
GET  /api/feed           → Event feed (scores, announcements)
POST /api/feed           → [Admin] Post announcement
POST /api/queues/:id     → [Admin] Update queue wait time
```

### WebSocket Events

```
Server → Client:
  "zone:update"     → { zoneId, density, trend }
  "queue:update"    → { queueId, waitMinutes, status }
  "feed:new"        → { type, message, timestamp }
  "alert:broadcast" → { severity, message }

Client → Server:
  "zone:checkin"    → { zoneId }  (attendee entered zone)
  "queue:join"      → { queueId } (attendee joined queue)
```

### Data Shapes

```json
// Zone
{
  "id": "zone-a1",
  "name": "North Stand - Gate A",
  "type": "seating|concourse|gate",
  "density": 72,          // 0-100 percentage
  "trend": "rising|falling|stable",
  "capacity": 5000,
  "currentCount": 3600
}

// Queue Point
{
  "id": "queue-f3",
  "name": "Hot Dogs & Burgers - Stand F3",
  "type": "food|drink|merch|restroom",
  "waitMinutes": 8,
  "status": "open|busy|closed",
  "location": { "zone": "zone-b2", "x": 45, "y": 67 }
}

// Feed Item
{
  "id": "feed-001",
  "type": "score|announcement|alert|milestone",
  "title": "GOAL!",
  "message": "Team A scores! 2-1",
  "timestamp": "2026-05-24T16:30:00Z",
  "severity": "info|warning|critical"
}
```

---

## 📁 Folder Structure

```
SportingVenueSystemm/
├── client/                    ← Developer 2 owns this
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css           ← Design system & global styles
│       ├── components/
│       │   ├── VenueMap.jsx     ← Interactive SVG stadium map
│       │   ├── VenueMap.css
│       │   ├── QueueBoard.jsx   ← Live queue wait times
│       │   ├── QueueBoard.css
│       │   ├── LiveFeed.jsx     ← Event feed & score updates
│       │   ├── LiveFeed.css
│       │   ├── SmartRec.jsx     ← Smart recommendations
│       │   ├── SmartRec.css
│       │   ├── Header.jsx
│       │   ├── Header.css
│       │   ├── AdminPanel.jsx   ← Admin dashboard
│       │   └── AdminPanel.css
│       ├── hooks/
│       │   └── useSocket.js     ← WebSocket hook
│       └── utils/
│           └── api.js           ← REST API helpers
│
├── server/                    ← Developer 1 owns this
│   ├── package.json
│   ├── index.js               ← Express + Socket.IO server
│   ├── routes/
│   │   ├── venue.js
│   │   ├── zones.js
│   │   ├── queues.js
│   │   └── feed.js
│   ├── data/
│   │   └── mock.js            ← Initial mock venue data
│   ├── simulation/
│   │   └── engine.js          ← Auto-simulate crowd movement
│   └── middleware/
│       └── cors.js
│
├── README.md
└── package.json               ← Root scripts (concurrently)
```

---

## ⏱️ 3-Hour Timeline

### Phase 0: Align (0:00 – 0:15) — BOTH TOGETHER
- [ ] Review this plan together
- [ ] Agree on API contract (endpoints + WebSocket events + data shapes)
- [ ] Set up repo structure: create `/client` and `/server` folders
- [ ] Initialize both `package.json` files
- [ ] **Decision**: Pick a venue theme (football stadium, cricket ground, etc.)

### Phase 1: Foundation (0:15 – 1:00)

| Dev 1 (Backend) | Dev 2 (Frontend) |
|-----------------|-------------------|
| Set up Express + Socket.IO server | Set up Vite + React app |
| Create mock data (`/server/data/mock.js`) | Build design system (`index.css`) |
| Implement `GET /api/venue` | Build `Header` + app layout |
| Implement `GET /api/zones` | Build `VenueMap` component (SVG stadium) |
| Implement `GET /api/queues` | Build `QueueBoard` component |
| Set up WebSocket connection handling | Create `useSocket` hook |

### Phase 2: Core Features (1:00 – 2:00)

| Dev 1 (Backend) | Dev 2 (Frontend) |
|-----------------|-------------------|
| Build simulation engine (auto-update densities) | Connect `VenueMap` to live zone data |
| Implement `GET /api/feed` + `POST /api/feed` | Build `LiveFeed` component |
| Emit `zone:update` events every 5s | Build `SmartRec` component (recommendations) |
| Emit `queue:update` events on changes | Add animations & transitions |
| Implement admin POST endpoints | Build `AdminPanel` for queue/alert management |

### Phase 3: Integration & Polish (2:00 – 2:45)

| Dev 1 (Backend) | Dev 2 (Frontend) |
|-----------------|-------------------|
| Fix any API issues from integration | Connect all components to real API |
| Add queue recommendation logic | Polish responsive design |
| Add alert broadcast system | Add micro-animations & hover effects |
| Stress test WebSocket connections | Dark mode / theme polish |

### Phase 4: Demo Prep (2:45 – 3:00) — BOTH TOGETHER
- [ ] Full end-to-end walkthrough
- [ ] Fix any last integration bugs
- [ ] Prepare demo script / talking points
- [ ] Record a quick screen capture if needed

---

## 🎨 UX Design Strategy

### Design Principles
1. **Mobile-First** — 90% of attendees will use phones
2. **Glanceable** — Info must be understood in < 2 seconds
3. **Dark Theme** — Better visibility in outdoor/stadium lighting
4. **Color-Coded Density** — Green (low) → Yellow (moderate) → Red (high)
5. **Large Touch Targets** — Easy to tap while walking/standing

### Color Palette

```css
/* Dark stadium theme */
--bg-primary:    #0a0e1a;      /* Deep navy black */
--bg-secondary:  #141b2d;      /* Card backgrounds */
--bg-glass:      rgba(20, 27, 45, 0.8);  /* Glassmorphism */
--accent-primary: #00d4ff;     /* Electric cyan */
--accent-secondary: #7c3aed;  /* Purple accent */
--accent-success: #10b981;    /* Green - low density */
--accent-warning: #f59e0b;    /* Amber - moderate */
--accent-danger:  #ef4444;    /* Red - high density */
--text-primary:  #f1f5f9;
--text-secondary: #94a3b8;
```

### Key UX Patterns
- **Pull-to-refresh** on mobile for manual data refresh
- **Bottom navigation** for mobile (Map / Queues / Feed / My Seat)
- **Toast notifications** for real-time alerts
- **Skeleton loading** states for perceived performance
- **Haptic-style animations** — subtle bounce/scale on interactions

### Venue Map Design
- SVG-based interactive stadium layout
- Zones are clickable regions with density color fill
- Pulsing animation on high-density zones
- Tap zone → shows details (capacity, trend, nearby amenities)

---

## 🔀 Git Workflow (No Conflicts)

```
main
 ├── dev-1/backend    ← Developer 1 works here
 └── dev-2/frontend   ← Developer 2 works here
```

1. Each developer works on their own branch
2. Both push frequently
3. Integration merges happen during Phase 3
4. Since `/client` and `/server` are separate folders, **zero merge conflicts**

---

## 🧪 Verification Plan

### Automated Tests
```bash
# Backend health check
curl http://localhost:3001/api/venue
curl http://localhost:3001/api/zones
curl http://localhost:3001/api/queues

# Frontend dev server
npm run dev  # Should open on :5173
```

### Integration Tests
- [ ] Open attendee app → venue map loads with zone colors
- [ ] Queue board shows real-time wait times updating
- [ ] Admin panel can post announcement → appears in attendee feed
- [ ] Zone density changes reflect on map within 5 seconds
- [ ] Smart recommendation suggests lowest-wait queue

### Manual Demo Verification
- [ ] Works on mobile viewport (Chrome DevTools)
- [ ] WebSocket reconnects on disconnect
- [ ] Admin broadcast shows as toast on attendee app

---

## User Review Required

> [!IMPORTANT]
> **Venue Theme**: Should we design for a specific sport (football/soccer stadium, cricket ground, basketball arena)? This affects the SVG map layout. Default: **football/soccer stadium**.

> [!IMPORTANT]
> **Scope Confirmation**: For a 3-hour window, I recommend building the **attendee mobile app + admin panel** as a single React app with route switching (`/` for attendee, `/admin` for dashboard). No authentication — just URL-based access. Is this acceptable?

## Open Questions

1. **Which developer are you?** (Frontend or Backend) — so I can start generating the right code for you first.
2. **Do you want me to scaffold the entire project now** (both client and server), or just one side?
3. **Venue capacity assumption**: Default to ~50,000 seat stadium with 8 zones, 12 concession stands, 6 restrooms. Good?
