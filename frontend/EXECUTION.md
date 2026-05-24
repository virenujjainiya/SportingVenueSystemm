# 🏟️ VenueFlow Frontend — Complete Execution Guide

> **Role**: You are Developer 2 (Frontend). You own everything in `/frontend`.
> **Time Budget**: 3 hours total. ~2.5 hours for frontend code.
> **Integration Partner**: Developer 1 is building the backend in `/backend` simultaneously.
> **DO NOT** touch any files in `/backend`.
> **Design Standard**: Apple-level smoothness. 60fps animations. PWA installable.

---

## SYSTEM CONTEXT

**Project**: VenueFlow — Real-time sporting venue companion system
**Purpose**: A mobile-first PWA that gives stadium attendees live crowd density maps, queue wait times, smart recommendations, and live match feeds — all updating in real-time via WebSocket.
**UX Standard**: Must feel as smooth and premium as an Apple native app. Every interaction must have spring animations, haptic-like feedback, and buttery transitions.

---

## DESIGN PHILOSOPHY

### The 5 Apple-Smooth Principles:
1. **Physics-based animations** — Use cubic-bezier spring curves, not linear transitions
2. **Instant feedback** — Every tap/click gets immediate visual response (< 50ms)
3. **Skeleton-first loading** — Never show blank screens; show animated placeholders
4. **Depth & layering** — Glassmorphism, shadows, and z-axis create spatial hierarchy
5. **Micro-interactions everywhere** — Hover glow, press scale, scroll parallax, pulse indicators

### Animation Timing Reference:
```css
/* Apple-style spring curves */
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);  /* Bouncy spring */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);              /* Material smooth */
--ease-snap:   cubic-bezier(0.68, -0.55, 0.265, 1.55);    /* Snap back */
--ease-out:    cubic-bezier(0, 0, 0.2, 1);                 /* Decelerate */

/* Duration scale */
--duration-fast:   150ms;   /* Micro-interactions (hover, press) */
--duration-normal: 300ms;   /* Standard transitions */
--duration-slow:   500ms;   /* Page transitions, modals */
--duration-enter:  400ms;   /* Elements entering viewport */
```

---

## TECH STACK

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^5.x | Build tool & dev server |
| `react` | ^18.x | UI library |
| `react-dom` | ^18.x | React DOM renderer |
| `socket.io-client` | ^4.7 | WebSocket client for real-time |
| `vite-plugin-pwa` | ^0.17 | PWA manifest & service worker generation |
| `workbox-window` | ^7.x | Service worker registration |

---

## FOLDER STRUCTURE

```
frontend/
├── index.html                    ← Entry HTML (PWA meta tags, fonts, theme-color)
├── vite.config.js                ← Vite config with PWA plugin
├── package.json
│
├── public/
│   ├── favicon.svg               ← App icon (SVG for crisp scaling)
│   ├── icon-192.png              ← PWA icon 192x192
│   ├── icon-512.png              ← PWA icon 512x512
│   ├── apple-touch-icon.png      ← iOS home screen icon
│   └── robots.txt
│
├── src/
│   ├── main.jsx                  ← React entry point + PWA registration
│   ├── App.jsx                   ← Root component, routing, layout
│   ├── App.css                   ← App-level layout styles
│   ├── index.css                 ← DESIGN SYSTEM — all tokens, utilities, globals
│   │
│   ├── components/
│   │   ├── Header/
│   │   │   ├── Header.jsx        ← Top bar: match score, clock, live indicator
│   │   │   └── Header.css
│   │   │
│   │   ├── BottomNav/
│   │   │   ├── BottomNav.jsx     ← iOS-style tab bar (Map/Queues/Feed/More)
│   │   │   └── BottomNav.css
│   │   │
│   │   ├── VenueMap/
│   │   │   ├── VenueMap.jsx      ← Interactive SVG stadium with density heatmap
│   │   │   └── VenueMap.css
│   │   │
│   │   ├── QueueBoard/
│   │   │   ├── QueueBoard.jsx    ← Live queue cards with wait times
│   │   │   └── QueueBoard.css
│   │   │
│   │   ├── LiveFeed/
│   │   │   ├── LiveFeed.jsx      ← Real-time event feed (scores, alerts)
│   │   │   └── LiveFeed.css
│   │   │
│   │   ├── SmartRec/
│   │   │   ├── SmartRec.jsx      ← AI recommendation cards
│   │   │   └── SmartRec.css
│   │   │
│   │   ├── AdminPanel/
│   │   │   ├── AdminPanel.jsx    ← Admin dashboard (queues, alerts, scores)
│   │   │   └── AdminPanel.css
│   │   │
│   │   ├── Toast/
│   │   │   ├── Toast.jsx         ← Floating notification toast
│   │   │   └── Toast.css
│   │   │
│   │   ├── Skeleton/
│   │   │   ├── Skeleton.jsx      ← Skeleton loading placeholders
│   │   │   └── Skeleton.css
│   │   │
│   │   ├── ZoneDetail/
│   │   │   ├── ZoneDetail.jsx    ← Zone detail modal (bottom sheet)
│   │   │   └── ZoneDetail.css
│   │   │
│   │   └── PWAPrompt/
│   │       ├── PWAPrompt.jsx     ← "Install App" prompt banner
│   │       └── PWAPrompt.css
│   │
│   ├── hooks/
│   │   ├── useSocket.js          ← WebSocket connection + event hook
│   │   ├── useVenueData.js       ← Central state manager for all venue data
│   │   └── usePWA.js             ← PWA install prompt hook
│   │
│   ├── utils/
│   │   ├── api.js                ← REST API helper (fetch wrapper)
│   │   └── constants.js          ← Shared constants (colors, config)
│   │
│   └── assets/
│       └── (empty — icons via emoji, no external assets needed)
│
└── EXECUTION.md                  ← This file
```

---

## STEP-BY-STEP BUILD ORDER

> **CRITICAL**: Follow this exact order. Each step builds on the previous one.

---

### STEP 1: Initialize Vite + React Project (Minute 0–5)

**Run these commands from the project root:**
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install socket.io-client
npm install -D vite-plugin-pwa workbox-window
```

**Update `package.json` scripts** (keep defaults, just verify):
```json
{
  "name": "venueflow-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

### STEP 2: Configure Vite with PWA Plugin

**File: `vite.config.js`**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'VenueFlow — Live Stadium Companion',
        short_name: 'VenueFlow',
        description: 'Real-time crowd density, queue times, and live match updates for stadium attendees',
        theme_color: '#0a0e1a',
        background_color: '#0a0e1a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['sports', 'entertainment', 'utilities'],
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60, // 1 minute cache for API
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
```

---

### STEP 3: Create Entry HTML with PWA Meta Tags

**File: `index.html`**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    
    <!-- SEO -->
    <title>VenueFlow — Live Stadium Companion</title>
    <meta name="description" content="Real-time crowd density, queue wait times, and live match updates. Never miss a moment at the stadium." />
    
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#0a0e1a" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="VenueFlow" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    
    <!-- Google Fonts — Inter for UI, Space Grotesk for headings -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
    
    <!-- Preload critical assets -->
    <style>
      /* Prevent FOUC — set bg immediately */
      html, body { background-color: #0a0e1a; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

### STEP 4: Create PWA Icons

**File: `public/favicon.svg`**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="#0a0e1a"/>
  <text x="50" y="68" font-size="55" text-anchor="middle" fill="url(#g)">🏟️</text>
</svg>
```

> **NOTE**: For `icon-192.png` and `icon-512.png`, generate these using any PNG generator or use a placeholder. The build will work without them in dev mode. Create simple solid-color PNG files with the stadium emoji as a quick placeholder.

**File: `public/robots.txt`**
```
User-agent: *
Allow: /
```

---

### STEP 5: Create the Design System (MOST IMPORTANT FILE)

**File: `src/index.css`**

This is the foundation. Every component pulls from these tokens.

```css
/* ================================================================
   VenueFlow Design System
   
   PHILOSOPHY: Apple-smooth, dark stadium theme, glassmorphism,
   spring animations, mobile-first responsive.
   
   ORGANIZATION:
   1. CSS Custom Properties (Design Tokens)
   2. Reset & Base Styles
   3. Typography Scale
   4. Utility Classes
   5. Animation Keyframes
   6. Skeleton Loading
   7. Scrollbar Styling
   8. Safe Area (notch devices)
   ================================================================ */

/* ── 1. DESIGN TOKENS ─────────────────────────────────────────── */
:root {
  /* Colors — Dark Stadium Theme */
  --bg-primary:      #0a0e1a;
  --bg-secondary:    #141b2d;
  --bg-tertiary:     #1a2340;
  --bg-card:         #161e33;
  --bg-hover:        #1e2a4a;
  --bg-active:       #253052;
  
  /* Glassmorphism */
  --glass-bg:        rgba(20, 27, 45, 0.75);
  --glass-border:    rgba(255, 255, 255, 0.08);
  --glass-blur:      20px;
  --glass-shadow:    0 8px 32px rgba(0, 0, 0, 0.4);
  
  /* Accent Colors */
  --accent-primary:   #00d4ff;  /* Electric cyan — primary actions */
  --accent-secondary: #7c3aed;  /* Purple — secondary elements */
  --accent-gradient:  linear-gradient(135deg, #00d4ff, #7c3aed);
  --accent-glow:      0 0 20px rgba(0, 212, 255, 0.3);
  
  /* Semantic Colors */
  --color-success:    #10b981;  /* Green — low density, open */
  --color-warning:    #f59e0b;  /* Amber — moderate density, busy */
  --color-danger:     #ef4444;  /* Red — high density, closed */
  --color-info:       #3b82f6;  /* Blue — informational */
  
  /* Density Gradient (used on venue map zones) */
  --density-low:      #10b981;  /* 0-30% */
  --density-medium:   #f59e0b;  /* 30-65% */
  --density-high:     #ef4444;  /* 65-85% */
  --density-critical: #dc2626;  /* 85-100% */
  
  /* Text Colors */
  --text-primary:     #f1f5f9;
  --text-secondary:   #94a3b8;
  --text-tertiary:    #64748b;
  --text-inverse:     #0a0e1a;
  --text-accent:      #00d4ff;
  
  /* Typography */
  --font-body:        'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-heading:     'Space Grotesk', 'Inter', sans-serif;
  --font-mono:        'SF Mono', 'Fira Code', monospace;
  
  /* Font Sizes — Fluid Scale */
  --text-xs:     0.75rem;    /* 12px */
  --text-sm:     0.8125rem;  /* 13px */
  --text-base:   0.9375rem;  /* 15px */
  --text-lg:     1.0625rem;  /* 17px */
  --text-xl:     1.25rem;    /* 20px */
  --text-2xl:    1.5rem;     /* 24px */
  --text-3xl:    2rem;       /* 32px */
  --text-4xl:    2.5rem;     /* 40px */
  
  /* Font Weights */
  --weight-light:     300;
  --weight-regular:   400;
  --weight-medium:    500;
  --weight-semibold:  600;
  --weight-bold:      700;
  
  /* Spacing Scale */
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-5:  1.25rem;   /* 20px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  
  /* Border Radius */
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   20px;
  --radius-2xl:  24px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm:    0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md:    0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-lg:    0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-xl:    0 16px 48px rgba(0, 0, 0, 0.5);
  --shadow-glow:  0 0 30px rgba(0, 212, 255, 0.15);
  
  /* Transitions — Apple Spring Curves */
  --ease-spring:  cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);
  --ease-snap:    cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1);
  
  --duration-fast:   150ms;
  --duration-normal: 300ms;
  --duration-slow:   500ms;
  --duration-enter:  400ms;
  
  /* Z-Index Scale */
  --z-base:     1;
  --z-card:     10;
  --z-sticky:   100;
  --z-header:   200;
  --z-overlay:  300;
  --z-modal:    400;
  --z-toast:    500;
  --z-nav:      600;
  
  /* Layout */
  --header-height:    60px;
  --bottom-nav-height: 72px;
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-top:    env(safe-area-inset-top, 0px);
  --content-max-width: 480px;
}

/* ── 2. RESET & BASE ──────────────────────────────────────────── */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: var(--weight-regular);
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  min-height: 100vh;
  min-height: 100dvh; /* Dynamic viewport height for mobile */
  overflow-x: hidden;
  overscroll-behavior-y: contain; /* Prevent pull-to-refresh on PWA */
}

#root {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

a {
  color: var(--accent-primary);
  text-decoration: none;
}

button {
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  outline: none;
  background: none;
  color: inherit;
  font-size: inherit;
}

img, svg {
  display: block;
  max-width: 100%;
}

input, textarea, select {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-smooth);
}

input:focus, textarea:focus, select:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.15);
}

/* ── 3. TYPOGRAPHY ────────────────────────────────────────────── */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: var(--weight-bold);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

h1 { font-size: var(--text-3xl); }
h2 { font-size: var(--text-2xl); }
h3 { font-size: var(--text-xl); }
h4 { font-size: var(--text-lg); }

.text-gradient {
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── 4. UTILITY CLASSES ───────────────────────────────────────── */

/* Glass card — the primary card style */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  transition: transform var(--duration-fast) var(--ease-spring),
              box-shadow var(--duration-fast) var(--ease-smooth);
}

.glass-card:active {
  transform: scale(0.98);
}

/* Tap feedback — for interactive elements */
.tap-target {
  position: relative;
  transition: transform var(--duration-fast) var(--ease-spring);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.tap-target:active {
  transform: scale(0.96);
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.badge--success { background: rgba(16, 185, 129, 0.15); color: var(--color-success); }
.badge--warning { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
.badge--danger  { background: rgba(239, 68, 68, 0.15);  color: var(--color-danger); }
.badge--info    { background: rgba(59, 130, 246, 0.15);  color: var(--color-info); }

/* Live indicator dot */
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-danger);
  animation: pulse-dot 2s ease-in-out infinite;
}

/* Density color utility — use with inline style for dynamic values */
.density-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Scrollable container */
.scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-tertiary) transparent;
}

/* Visually hidden but accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* ── 5. ANIMATION KEYFRAMES ───────────────────────────────────── */

/* Pulse for live indicators */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.5); }
}

/* Fade in + slide up — for entering elements */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Fade in + scale — for modals/toasts */
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Slide in from bottom — for bottom sheets */
@keyframes slideInBottom {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Shimmer — for skeleton loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Gentle float — for ambient animation */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* Glow pulse — for highlighted elements */
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 10px rgba(0, 212, 255, 0.2); }
  50% { box-shadow: 0 0 25px rgba(0, 212, 255, 0.4); }
}

/* Spin — for loading indicators */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Stagger helper — children animate in sequence */
.stagger-children > * {
  animation: fadeInUp var(--duration-enter) var(--ease-out) forwards;
  opacity: 0;
}
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 60ms; }
.stagger-children > *:nth-child(3) { animation-delay: 120ms; }
.stagger-children > *:nth-child(4) { animation-delay: 180ms; }
.stagger-children > *:nth-child(5) { animation-delay: 240ms; }
.stagger-children > *:nth-child(6) { animation-delay: 300ms; }
.stagger-children > *:nth-child(7) { animation-delay: 360ms; }
.stagger-children > *:nth-child(8) { animation-delay: 420ms; }
.stagger-children > *:nth-child(9) { animation-delay: 480ms; }
.stagger-children > *:nth-child(10) { animation-delay: 540ms; }
.stagger-children > *:nth-child(n+11) { animation-delay: 600ms; }

/* ── 6. SKELETON LOADING ──────────────────────────────────────── */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-tertiary) 25%,
    var(--bg-hover) 50%,
    var(--bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

.skeleton--text {
  height: 14px;
  width: 80%;
  margin-bottom: var(--space-2);
}

.skeleton--title {
  height: 20px;
  width: 60%;
  margin-bottom: var(--space-3);
}

.skeleton--card {
  height: 80px;
  width: 100%;
  margin-bottom: var(--space-3);
}

.skeleton--circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

/* ── 7. SCROLLBAR ─────────────────────────────────────────────── */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* ── 8. SAFE AREA (Notch Devices) ─────────────────────────────── */
@supports (padding: env(safe-area-inset-top)) {
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* ── 9. RESPONSIVE BREAKPOINTS ────────────────────────────────── */
/* Mobile first — these are "up" breakpoints */
@media (min-width: 640px) {
  :root {
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.375rem;
    --text-2xl: 1.75rem;
    --text-3xl: 2.25rem;
  }
}

@media (min-width: 1024px) {
  :root {
    --content-max-width: 1200px;
    --bottom-nav-height: 0px; /* No bottom nav on desktop */
  }
}

/* ── 10. PRINT STYLES ─────────────────────────────────────────── */
@media print {
  body { background: white; color: black; }
  .glass-card { background: white; border: 1px solid #ddd; }
}
```

---

### STEP 6: Create Utility Files

**File: `src/utils/constants.js`**
```javascript
/*
 * Shared constants for the frontend app.
 * All magic numbers, config values, and enums live here.
 */

// Backend API base URL — in dev, Vite proxy handles /api
// In production, set this to the deployed backend URL
export const API_BASE = import.meta.env.VITE_API_URL || '';

// Socket.IO URL — same as API base, or explicit backend URL in production
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Navigation tabs
export const TABS = {
  MAP: 'map',
  QUEUES: 'queues',
  FEED: 'feed',
  MORE: 'more',
};

// Tab configuration for BottomNav
export const TAB_CONFIG = [
  { id: TABS.MAP, label: 'Map', icon: '🗺️', activeIcon: '🗺️' },
  { id: TABS.QUEUES, label: 'Queues', icon: '⏱️', activeIcon: '⏱️' },
  { id: TABS.FEED, label: 'Feed', icon: '📢', activeIcon: '📢' },
  { id: TABS.MORE, label: 'More', icon: '⚙️', activeIcon: '⚙️' },
];

// Density thresholds and colors
export const DENSITY = {
  LOW: { max: 30, color: '#10b981', label: 'Low', bg: 'rgba(16, 185, 129, 0.15)' },
  MEDIUM: { max: 65, color: '#f59e0b', label: 'Moderate', bg: 'rgba(245, 158, 11, 0.15)' },
  HIGH: { max: 85, color: '#ef4444', label: 'High', bg: 'rgba(239, 68, 68, 0.15)' },
  CRITICAL: { max: 100, color: '#dc2626', label: 'Very High', bg: 'rgba(220, 38, 38, 0.15)' },
};

// Get density info for a percentage
export function getDensityInfo(percent) {
  if (percent <= DENSITY.LOW.max) return DENSITY.LOW;
  if (percent <= DENSITY.MEDIUM.max) return DENSITY.MEDIUM;
  if (percent <= DENSITY.HIGH.max) return DENSITY.HIGH;
  return DENSITY.CRITICAL;
}

// Queue type icons
export const QUEUE_ICONS = {
  food: '🍔',
  drink: '🍺',
  merch: '👕',
  restroom: '🚻',
};

// Feed type config
export const FEED_TYPES = {
  score: { icon: '⚽', color: '#f59e0b', label: 'Score' },
  announcement: { icon: '📢', color: '#3b82f6', label: 'Announcement' },
  alert: { icon: '🚨', color: '#ef4444', label: 'Alert' },
  milestone: { icon: '🎉', color: '#7c3aed', label: 'Milestone' },
};

// Severity colors
export const SEVERITY = {
  info: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  warning: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

// Time formatter
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
```

**File: `src/utils/api.js`**
```javascript
/*
 * REST API Helper
 * 
 * Wraps fetch with:
 * - Automatic JSON parsing
 * - Error handling with retry
 * - Base URL configuration
 * - Request timeout (8 seconds)
 * 
 * All functions return: { success: boolean, data?: any, error?: string }
 */

import { API_BASE } from './constants';

const DEFAULT_TIMEOUT = 8000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timed out' };
    }
    return { success: false, error: error.message };
  }
}

// ── API Methods ───────────────────────────────────────────────
export const api = {
  // Venue
  getVenue: () => request('/api/venue'),

  // Zones
  getZones: () => request('/api/zones'),
  getZone: (id) => request(`/api/zones/${id}`),
  updateZone: (id, data) => request(`/api/zones/${id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Queues
  getQueues: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/queues${query ? `?${query}` : ''}`);
  },
  getRecommendations: (type) => request(`/api/queues/recommend${type ? `?type=${type}` : ''}`),
  updateQueue: (id, data) => request(`/api/queues/${id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Feed
  getFeed: (limit = 50) => request(`/api/feed?limit=${limit}`),
  postFeed: (data) => request('/api/feed', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Stats
  getStats: () => request('/api/stats'),

  // Health
  health: () => request('/health'),
};

export default api;
```

---

### STEP 7: Create Hooks

**File: `src/hooks/useSocket.js`**
```javascript
/*
 * useSocket Hook
 * 
 * Manages Socket.IO connection lifecycle.
 * - Auto-connects on mount
 * - Auto-reconnects on disconnect
 * - Provides event subscription helper
 * - Cleans up on unmount
 * 
 * Usage:
 *   const { socket, isConnected, on, emit } = useSocket();
 *   
 *   useEffect(() => {
 *     const unsub = on('zone:update', (data) => { ... });
 *     return unsub;
 *   }, [on]);
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setIsConnected(false);
    });

    socket.on('stats:connections', (data) => {
      setConnectionCount(data.connectedClients);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Subscribe to an event — returns unsubscribe function
  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  // Emit an event
  const emit = useCallback((event, data) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionCount,
    on,
    emit,
  };
}

export default useSocket;
```

**File: `src/hooks/useVenueData.js`**
```javascript
/*
 * useVenueData Hook
 * 
 * Central state manager for all venue data.
 * - Fetches initial data via REST API
 * - Subscribes to Socket.IO for real-time updates
 * - Merges updates efficiently (no full re-fetch)
 * - Provides loading/error states
 * 
 * This is the SINGLE SOURCE OF TRUTH for the UI.
 * All components consume data from this hook.
 * 
 * Usage:
 *   const {
 *     venue, zones, queues, feed, stats,
 *     isLoading, error, isConnected,
 *     toasts, dismissToast
 *   } = useVenueData();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import api from '../utils/api';

export function useVenueData() {
  // State
  const [venue, setVenue] = useState(null);
  const [zones, setZones] = useState([]);
  const [queues, setQueues] = useState([]);
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [matchClock, setMatchClock] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  // Socket connection
  const { isConnected, connectionCount, on, emit } = useSocket();

  // ── Add Toast ──────────────────────────────────────────────
  const addToast = useCallback((toast) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { ...toast, id }]);
    // Auto-dismiss after 5s (critical alerts stay 8s)
    const duration = toast.severity === 'critical' ? 8000 : 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Initial Data Fetch ─────────────────────────────────────
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setIsLoading(true);
        const [venueRes, zonesRes, queuesRes, feedRes, statsRes] = await Promise.all([
          api.getVenue(),
          api.getZones(),
          api.getQueues(),
          api.getFeed(30),
          api.getStats(),
        ]);

        if (venueRes.success) setVenue(venueRes.data);
        if (zonesRes.success) setZones(zonesRes.data);
        if (queuesRes.success) setQueues(queuesRes.data);
        if (feedRes.success) setFeed(feedRes.data);
        if (statsRes.success) setStats(statsRes.data);
        
        setError(null);
      } catch (err) {
        setError('Failed to load venue data. Please check your connection.');
        console.error('[VenueData] Initial fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // ── Socket.IO Initial State ────────────────────────────────
  useEffect(() => {
    const unsub = on('init:state', (data) => {
      if (data.venue) setVenue(data.venue);
      if (data.zones) setZones(data.zones);
      if (data.queues) setQueues(data.queues);
      if (data.feed) setFeed(data.feed);
      if (data.stats) setStats(data.stats);
      setIsLoading(false);
    });
    return unsub;
  }, [on]);

  // ── Real-time Zone Updates ─────────────────────────────────
  useEffect(() => {
    const unsub = on('zone:update', (updatedZone) => {
      setZones((prev) =>
        prev.map((z) => (z.id === updatedZone.id ? { ...z, ...updatedZone } : z))
      );
    });
    return unsub;
  }, [on]);

  // ── Real-time Queue Updates ────────────────────────────────
  useEffect(() => {
    const unsub = on('queue:update', (updatedQueue) => {
      setQueues((prev) =>
        prev.map((q) => (q.id === updatedQueue.id ? { ...q, ...updatedQueue } : q))
      );
    });
    return unsub;
  }, [on]);

  // ── Real-time Feed Updates ─────────────────────────────────
  useEffect(() => {
    const unsub = on('feed:new', (newItem) => {
      setFeed((prev) => [newItem, ...prev].slice(0, 100));
    });
    return unsub;
  }, [on]);

  // ── Match Clock Updates ────────────────────────────────────
  useEffect(() => {
    const unsub = on('venue:clock', (clockData) => {
      setMatchClock(clockData);
      // Update venue status
      setVenue((prev) => prev ? { ...prev, status: clockData.status } : prev);
    });
    return unsub;
  }, [on]);

  // ── Alert Broadcasts → Toast Notifications ─────────────────
  useEffect(() => {
    const unsub = on('alert:broadcast', (alert) => {
      addToast({
        type: 'alert',
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp,
      });
    });
    return unsub;
  }, [on, addToast]);

  // ── Request refresh ────────────────────────────────────────
  const refresh = useCallback(() => {
    emit('request:refresh');
  }, [emit]);

  return {
    // Data
    venue,
    zones,
    queues,
    feed,
    stats,
    matchClock,
    
    // Connection
    isConnected,
    connectionCount,
    
    // UI State
    isLoading,
    error,
    toasts,
    
    // Actions
    refresh,
    emit,
    dismissToast,
    addToast,
  };
}

export default useVenueData;
```

**File: `src/hooks/usePWA.js`**
```javascript
/*
 * usePWA Hook
 * 
 * Handles PWA install prompt lifecycle.
 * - Captures `beforeinstallprompt` event
 * - Provides `canInstall` flag and `promptInstall` function
 * - Tracks if app is already installed
 * 
 * Usage:
 *   const { canInstall, isInstalled, promptInstall } = usePWA();
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Capture install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };

    // Track successful installation
    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return false;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setCanInstall(false);
    }
    
    deferredPromptRef.current = null;
    return outcome === 'accepted';
  }, []);

  return { canInstall, isInstalled, promptInstall };
}

export default usePWA;
```

---

### STEP 8: Create Components

> **IMPORTANT**: Each component is in its own folder with a `.jsx` and `.css` file. Follow the exact specifications below.

---

#### Component: Header

**File: `src/components/Header/Header.jsx`**
```jsx
/*
 * Header Component
 * 
 * Displays:
 * - Live match score with team logos
 * - Match clock (auto-updating)
 * - Connection status indicator
 * - Venue name
 * 
 * Fixed at top of screen. Glassmorphism background.
 * Must feel premium — this is the first thing users see.
 */

import { useMemo } from 'react';
import './Header.css';

export default function Header({ venue, matchClock, isConnected }) {
  const score = useMemo(() => {
    if (matchClock?.score) return matchClock.score;
    if (venue?.match) {
      return {
        home: { name: venue.match.homeTeam.shortName, score: venue.match.homeTeam.score },
        away: { name: venue.match.awayTeam.shortName, score: venue.match.awayTeam.score },
      };
    }
    return null;
  }, [matchClock, venue]);

  const clock = matchClock?.clock || venue?.match?.clock || '--:--';
  const status = matchClock?.status || venue?.status || 'upcoming';
  const half = matchClock?.half || venue?.match?.half || 1;

  return (
    <header className="header safe-area-top" id="main-header">
      <div className="header__inner">
        {/* Live indicator */}
        <div className="header__status">
          <div className={`header__connection ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="header__connection-dot" />
            <span className="header__connection-text">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Score display */}
        {score && (
          <div className="header__score">
            <div className="header__team header__team--home">
              <span className="header__team-logo">{venue?.match?.homeTeam?.logo || '⚡'}</span>
              <span className="header__team-name">{score.home.name}</span>
              <span className="header__team-score">{score.home.score}</span>
            </div>

            <div className="header__clock-container">
              <div className={`header__clock ${status === 'live' ? 'header__clock--live' : ''}`}>
                {clock}
              </div>
              <div className="header__half">
                {status === 'halftime' ? 'HT' : status === 'ended' ? 'FT' : `H${half}`}
              </div>
            </div>

            <div className="header__team header__team--away">
              <span className="header__team-score">{score.away.score}</span>
              <span className="header__team-name">{score.away.name}</span>
              <span className="header__team-logo">{venue?.match?.awayTeam?.logo || '🔥'}</span>
            </div>
          </div>
        )}

        {/* Venue name */}
        <div className="header__venue-name">{venue?.name || 'Loading...'}</div>
      </div>
    </header>
  );
}
```

**File: `src/components/Header/Header.css`**
```css
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-header);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-bottom: 1px solid var(--glass-border);
}

.header__inner {
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-2) var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

/* Status / Connection */
.header__status {
  width: 100%;
  display: flex;
  justify-content: center;
}

.header__connection {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: var(--weight-bold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.header__connection.connected {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
}

.header__connection.disconnected {
  background: rgba(100, 116, 139, 0.15);
  color: var(--text-tertiary);
}

.header__connection-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.header__connection.connected .header__connection-dot {
  animation: pulse-dot 2s ease-in-out infinite;
}

/* Score */
.header__score {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  width: 100%;
}

.header__team {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
}

.header__team--home {
  justify-content: flex-end;
}

.header__team--away {
  justify-content: flex-start;
}

.header__team-logo {
  font-size: 1.5rem;
}

.header__team-name {
  font-family: var(--font-heading);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--text-secondary);
}

.header__team-score {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  color: var(--text-primary);
  min-width: 28px;
  text-align: center;
}

/* Clock */
.header__clock-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.header__clock {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--text-secondary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}

.header__clock--live {
  color: var(--color-danger);
  animation: glowPulse 3s ease-in-out infinite;
}

.header__half {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-weight: var(--weight-semibold);
  margin-top: 2px;
}

/* Venue Name */
.header__venue-name {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-align: center;
  letter-spacing: 0.05em;
}
```

---

#### Component: BottomNav

**File: `src/components/BottomNav/BottomNav.jsx`**
```jsx
/*
 * BottomNav Component
 * 
 * iOS-style bottom tab bar with:
 * - 4 tabs: Map, Queues, Feed, More
 * - Active tab indicator with spring animation
 * - Haptic-like press feedback (scale down)
 * - Floating above content with glassmorphism
 * - Safe area padding for notch devices
 */

import { TAB_CONFIG } from '../../utils/constants';
import './BottomNav.css';

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav safe-area-bottom" id="bottom-nav">
      <div className="bottom-nav__inner">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            className={`bottom-nav__tab tap-target ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.label}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <span className="bottom-nav__icon">
              {activeTab === tab.id ? tab.activeIcon : tab.icon}
            </span>
            <span className="bottom-nav__label">{tab.label}</span>
            {activeTab === tab.id && <span className="bottom-nav__indicator" />}
          </button>
        ))}
      </div>
    </nav>
  );
}
```

**File: `src/components/BottomNav/BottomNav.css`**
```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-nav);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-top: 1px solid var(--glass-border);
}

.bottom-nav__inner {
  max-width: var(--content-max-width);
  margin: 0 auto;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: var(--space-2) var(--space-4) var(--space-1);
}

.bottom-nav__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  position: relative;
  min-width: 64px;
  transition: all var(--duration-fast) var(--ease-spring);
}

.bottom-nav__tab:active {
  transform: scale(0.9);
}

.bottom-nav__tab.active {
  color: var(--accent-primary);
}

.bottom-nav__tab:not(.active) {
  color: var(--text-tertiary);
}

.bottom-nav__icon {
  font-size: 1.4rem;
  line-height: 1;
  transition: transform var(--duration-normal) var(--ease-spring);
}

.bottom-nav__tab.active .bottom-nav__icon {
  transform: scale(1.1);
}

.bottom-nav__label {
  font-size: 10px;
  font-weight: var(--weight-semibold);
  letter-spacing: 0.02em;
}

.bottom-nav__indicator {
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  border-radius: var(--radius-full);
  background: var(--accent-primary);
  animation: fadeInScale var(--duration-normal) var(--ease-spring);
}

/* Hide on desktop */
@media (min-width: 1024px) {
  .bottom-nav {
    display: none;
  }
}
```

---

#### Component: VenueMap

**File: `src/components/VenueMap/VenueMap.jsx`**
```jsx
/*
 * VenueMap Component
 * 
 * Interactive SVG stadium map showing:
 * - All zones as colored regions (density heatmap)
 * - Queue point markers
 * - Tap on zone → shows detail modal
 * - Pulsing animation on high-density zones
 * - Smooth color transitions on density changes
 * 
 * This is the hero component — must look stunning.
 * Uses an overhead stadium layout with seating sections.
 */

import { useState, useMemo } from 'react';
import { getDensityInfo } from '../../utils/constants';
import './VenueMap.css';

export default function VenueMap({ zones, queues, onZoneSelect }) {
  const [hoveredZone, setHoveredZone] = useState(null);

  // Map zone data by ID for quick lookup
  const zoneMap = useMemo(() => {
    const map = {};
    zones.forEach((z) => { map[z.id] = z; });
    return map;
  }, [zones]);

  const getZoneColor = (zoneId) => {
    const zone = zoneMap[zoneId];
    if (!zone) return '#1a2340';
    return getDensityInfo(zone.density).color;
  };

  const getZoneOpacity = (zoneId) => {
    const zone = zoneMap[zoneId];
    if (!zone) return 0.3;
    return 0.3 + (zone.density / 100) * 0.5;
  };

  const isHighDensity = (zoneId) => {
    const zone = zoneMap[zoneId];
    return zone && zone.density > 80;
  };

  return (
    <div className="venue-map" id="venue-map">
      <div className="venue-map__container">
        <svg
          viewBox="0 0 400 500"
          xmlns="http://www.w3.org/2000/svg"
          className="venue-map__svg"
        >
          <defs>
            {/* Gradient for the pitch/field */}
            <linearGradient id="fieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#15803d" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#166534" stopOpacity="0.8" />
            </linearGradient>
            {/* Glow filter for high-density zones */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Shadow filter */}
            <filter id="zoneShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width="400" height="500" fill={`var(--bg-primary)`} rx="20" />

          {/* Stadium outer ring */}
          <ellipse cx="200" cy="250" rx="185" ry="220" fill="none" stroke="var(--glass-border)" strokeWidth="2" />

          {/* ── SEATING ZONES ─────────────────────────── */}
          
          {/* North Stand */}
          <path
            d="M 80 80 Q 200 30 320 80 L 300 130 Q 200 90 100 130 Z"
            className={`venue-map__zone ${hoveredZone === 'zone-north' ? 'hovered' : ''} ${isHighDensity('zone-north') ? 'high-density' : ''}`}
            fill={getZoneColor('zone-north')}
            fillOpacity={getZoneOpacity('zone-north')}
            stroke={getZoneColor('zone-north')}
            strokeWidth="1.5"
            strokeOpacity="0.6"
            filter="url(#zoneShadow)"
            onClick={() => onZoneSelect?.(zoneMap['zone-north'])}
            onMouseEnter={() => setHoveredZone('zone-north')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="200" y="100" textAnchor="middle" className="venue-map__zone-label">
            North Stand
          </text>
          <text x="200" y="115" textAnchor="middle" className="venue-map__zone-percent">
            {zoneMap['zone-north']?.density || 0}%
          </text>

          {/* South Stand */}
          <path
            d="M 80 420 Q 200 470 320 420 L 300 370 Q 200 410 100 370 Z"
            className={`venue-map__zone ${hoveredZone === 'zone-south' ? 'hovered' : ''} ${isHighDensity('zone-south') ? 'high-density' : ''}`}
            fill={getZoneColor('zone-south')}
            fillOpacity={getZoneOpacity('zone-south')}
            stroke={getZoneColor('zone-south')}
            strokeWidth="1.5"
            strokeOpacity="0.6"
            filter="url(#zoneShadow)"
            onClick={() => onZoneSelect?.(zoneMap['zone-south'])}
            onMouseEnter={() => setHoveredZone('zone-south')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="200" y="400" textAnchor="middle" className="venue-map__zone-label">
            South Stand
          </text>
          <text x="200" y="415" textAnchor="middle" className="venue-map__zone-percent">
            {zoneMap['zone-south']?.density || 0}%
          </text>

          {/* East Wing */}
          <path
            d="M 320 80 Q 380 250 320 420 L 280 380 Q 330 250 280 120 Z"
            className={`venue-map__zone ${hoveredZone === 'zone-east' ? 'hovered' : ''} ${isHighDensity('zone-east') ? 'high-density' : ''}`}
            fill={getZoneColor('zone-east')}
            fillOpacity={getZoneOpacity('zone-east')}
            stroke={getZoneColor('zone-east')}
            strokeWidth="1.5"
            strokeOpacity="0.6"
            filter="url(#zoneShadow)"
            onClick={() => onZoneSelect?.(zoneMap['zone-east'])}
            onMouseEnter={() => setHoveredZone('zone-east')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="340" y="250" textAnchor="middle" className="venue-map__zone-label" transform="rotate(90, 340, 250)">
            East Wing
          </text>

          {/* West Wing */}
          <path
            d="M 80 80 Q 20 250 80 420 L 120 380 Q 70 250 120 120 Z"
            className={`venue-map__zone ${hoveredZone === 'zone-west' ? 'hovered' : ''} ${isHighDensity('zone-west') ? 'high-density' : ''}`}
            fill={getZoneColor('zone-west')}
            fillOpacity={getZoneOpacity('zone-west')}
            stroke={getZoneColor('zone-west')}
            strokeWidth="1.5"
            strokeOpacity="0.6"
            filter="url(#zoneShadow)"
            onClick={() => onZoneSelect?.(zoneMap['zone-west'])}
            onMouseEnter={() => setHoveredZone('zone-west')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="60" y="250" textAnchor="middle" className="venue-map__zone-label" transform="rotate(-90, 60, 250)">
            West Wing
          </text>

          {/* ── CONCOURSE ZONES ────────────────────────── */}
          
          {/* North Concourse */}
          <rect
            x="120" y="135" width="160" height="30" rx="8"
            className={`venue-map__zone ${hoveredZone === 'zone-concourse-n' ? 'hovered' : ''}`}
            fill={getZoneColor('zone-concourse-n')}
            fillOpacity={getZoneOpacity('zone-concourse-n')}
            stroke={getZoneColor('zone-concourse-n')}
            strokeWidth="1"
            strokeOpacity="0.4"
            onClick={() => onZoneSelect?.(zoneMap['zone-concourse-n'])}
            onMouseEnter={() => setHoveredZone('zone-concourse-n')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="200" y="155" textAnchor="middle" className="venue-map__zone-label-sm">
            N. Concourse {zoneMap['zone-concourse-n']?.density || 0}%
          </text>

          {/* South Concourse */}
          <rect
            x="120" y="335" width="160" height="30" rx="8"
            className={`venue-map__zone ${hoveredZone === 'zone-concourse-s' ? 'hovered' : ''}`}
            fill={getZoneColor('zone-concourse-s')}
            fillOpacity={getZoneOpacity('zone-concourse-s')}
            stroke={getZoneColor('zone-concourse-s')}
            strokeWidth="1"
            strokeOpacity="0.4"
            onClick={() => onZoneSelect?.(zoneMap['zone-concourse-s'])}
            onMouseEnter={() => setHoveredZone('zone-concourse-s')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="200" y="355" textAnchor="middle" className="venue-map__zone-label-sm">
            S. Concourse {zoneMap['zone-concourse-s']?.density || 0}%
          </text>

          {/* ── FOOTBALL PITCH ──────────────────────────── */}
          <rect x="130" y="170" width="140" height="160" rx="4"
            fill="url(#fieldGradient)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          {/* Center circle */}
          <circle cx="200" cy="250" r="25" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <circle cx="200" cy="250" r="2" fill="rgba(255,255,255,0.4)" />
          {/* Center line */}
          <line x1="130" y1="250" x2="270" y2="250" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          {/* Penalty boxes */}
          <rect x="160" y="170" width="80" height="30" rx="1" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
          <rect x="160" y="300" width="80" height="30" rx="1" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />

          {/* ── VIP ZONE ────────────────────────────────── */}
          <rect
            x="275" y="220" width="8" height="60" rx="4"
            className={`venue-map__zone ${hoveredZone === 'zone-vip' ? 'hovered' : ''}`}
            fill={getZoneColor('zone-vip')}
            fillOpacity={getZoneOpacity('zone-vip')}
            stroke="#fbbf24"
            strokeWidth="1"
            strokeOpacity="0.6"
            onClick={() => onZoneSelect?.(zoneMap['zone-vip'])}
            onMouseEnter={() => setHoveredZone('zone-vip')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="290" y="254" className="venue-map__zone-label-sm" fill="#fbbf24">VIP</text>

          {/* ── GATE MARKERS ────────────────────────────── */}
          {['zone-gate-a', 'zone-gate-b', 'zone-gate-c', 'zone-gate-d'].map((gateId, i) => {
            const positions = [
              { x: 60, y: 65 },   // Gate A - NW
              { x: 340, y: 65 },  // Gate B - NE
              { x: 340, y: 435 }, // Gate C - SE
              { x: 60, y: 435 },  // Gate D - SW
            ];
            const gate = zoneMap[gateId];
            const pos = positions[i];
            const label = ['A', 'B', 'C', 'D'][i];
            return (
              <g key={gateId}
                className={`venue-map__zone tap-target ${hoveredZone === gateId ? 'hovered' : ''}`}
                onClick={() => onZoneSelect?.(gate)}
                onMouseEnter={() => setHoveredZone(gateId)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <circle cx={pos.x} cy={pos.y} r="18"
                  fill={getZoneColor(gateId)}
                  fillOpacity={getZoneOpacity(gateId)}
                  stroke={getZoneColor(gateId)}
                  strokeWidth="1.5"
                  strokeOpacity="0.5"
                />
                <text x={pos.x} y={pos.y - 3} textAnchor="middle" className="venue-map__gate-label">
                  Gate {label}
                </text>
                <text x={pos.x} y={pos.y + 10} textAnchor="middle" className="venue-map__gate-percent">
                  {gate?.density || 0}%
                </text>
              </g>
            );
          })}

          {/* ── QUEUE MARKERS ───────────────────────────── */}
          {queues.filter(q => q.status !== 'closed').map((queue) => {
            // Map queue positions to SVG coordinates
            const svgX = queue.x * 4;
            const svgY = queue.y * 5;
            return (
              <g key={queue.id} className="venue-map__queue-marker">
                <circle cx={svgX} cy={svgY} r="8"
                  fill="var(--bg-secondary)" stroke="var(--accent-primary)" strokeWidth="1" opacity="0.9" />
                <text x={svgX} y={svgY + 3.5} textAnchor="middle" fontSize="8">
                  {queue.icon}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Density Legend */}
        <div className="venue-map__legend">
          <span className="venue-map__legend-item">
            <span className="venue-map__legend-dot" style={{ background: 'var(--density-low)' }} />
            Low
          </span>
          <span className="venue-map__legend-item">
            <span className="venue-map__legend-dot" style={{ background: 'var(--density-medium)' }} />
            Moderate
          </span>
          <span className="venue-map__legend-item">
            <span className="venue-map__legend-dot" style={{ background: 'var(--density-high)' }} />
            High
          </span>
          <span className="venue-map__legend-item">
            <span className="venue-map__legend-dot" style={{ background: 'var(--density-critical)' }} />
            Critical
          </span>
        </div>
      </div>
    </div>
  );
}
```

**File: `src/components/VenueMap/VenueMap.css`**
```css
.venue-map {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2);
  animation: fadeInUp var(--duration-enter) var(--ease-out);
}

.venue-map__container {
  width: 100%;
  max-width: 420px;
  position: relative;
}

.venue-map__svg {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3));
}

/* Zone interactive states */
.venue-map__zone {
  cursor: pointer;
  transition: fill-opacity 0.5s ease, stroke-opacity 0.3s ease, filter 0.3s ease;
}

.venue-map__zone:hover,
.venue-map__zone.hovered {
  fill-opacity: 0.85 !important;
  stroke-opacity: 1 !important;
  filter: url(#glow);
}

.venue-map__zone.high-density {
  animation: glowPulse 2s ease-in-out infinite;
}

/* Text labels */
.venue-map__zone-label {
  fill: var(--text-primary);
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-heading);
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.venue-map__zone-percent {
  fill: var(--text-secondary);
  font-size: 9px;
  font-weight: 500;
  font-family: var(--font-mono);
  pointer-events: none;
}

.venue-map__zone-label-sm {
  fill: var(--text-secondary);
  font-size: 8px;
  font-weight: 500;
  pointer-events: none;
}

.venue-map__gate-label {
  fill: var(--text-primary);
  font-size: 7px;
  font-weight: 700;
  pointer-events: none;
}

.venue-map__gate-percent {
  fill: var(--text-secondary);
  font-size: 7px;
  font-weight: 500;
  font-family: var(--font-mono);
  pointer-events: none;
}

/* Queue markers */
.venue-map__queue-marker {
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring);
}

.venue-map__queue-marker:hover {
  transform: scale(1.3);
}

/* Legend */
.venue-map__legend {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  flex-wrap: wrap;
}

.venue-map__legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.venue-map__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

---

#### Component: QueueBoard

**File: `src/components/QueueBoard/QueueBoard.jsx`**
```jsx
/*
 * QueueBoard Component
 * 
 * Displays all queue points as cards with:
 * - Wait time (large number)
 * - Queue name and type icon
 * - Status badge (open/busy/closed)
 * - Trend indicator (growing/shrinking/stable)
 * - Filter tabs by type (All, Food, Drink, Merch, Restroom)
 * - Smart recommendation banner at top
 * 
 * Cards animate in with stagger effect.
 * Wait times pulse when they change.
 */

import { useState, useMemo, useEffect } from 'react';
import { getDensityInfo, QUEUE_ICONS } from '../../utils/constants';
import api from '../../utils/api';
import './QueueBoard.css';

const FILTER_TABS = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'food', label: 'Food', icon: '🍔' },
  { id: 'drink', label: 'Drinks', icon: '🍺' },
  { id: 'restroom', label: 'Restroom', icon: '🚻' },
  { id: 'merch', label: 'Merch', icon: '👕' },
];

export default function QueueBoard({ queues }) {
  const [filter, setFilter] = useState('all');
  const [recommendations, setRecommendations] = useState([]);
  const [prevWaits, setPrevWaits] = useState({});

  // Track wait time changes for pulse animation
  useEffect(() => {
    const newWaits = {};
    queues.forEach((q) => { newWaits[q.id] = q.waitMinutes; });
    setPrevWaits(newWaits);
  }, [queues]);

  // Fetch recommendations
  useEffect(() => {
    async function fetchRecs() {
      const type = filter === 'all' ? null : filter;
      const res = await api.getRecommendations(type);
      if (res.success) setRecommendations(res.data);
    }
    fetchRecs();
    const interval = setInterval(fetchRecs, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const filteredQueues = useMemo(() => {
    let list = [...queues];
    if (filter !== 'all') list = list.filter((q) => q.type === filter);
    list.sort((a, b) => a.waitMinutes - b.waitMinutes);
    return list;
  }, [queues, filter]);

  const bestRec = recommendations[0];

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'growing': return '📈';
      case 'shrinking': return '📉';
      default: return '➡️';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'open': return 'badge--success';
      case 'busy': return 'badge--warning';
      case 'closed': return 'badge--danger';
      default: return 'badge--info';
    }
  };

  return (
    <div className="queue-board" id="queue-board">
      {/* Smart Recommendation */}
      {bestRec && (
        <div className="queue-board__recommendation glass-card" id="smart-recommendation">
          <div className="queue-board__rec-header">
            <span className="queue-board__rec-icon">💡</span>
            <span className="queue-board__rec-title">Smart Pick</span>
          </div>
          <div className="queue-board__rec-body">
            <span className="queue-board__rec-emoji">{bestRec.icon}</span>
            <div className="queue-board__rec-info">
              <span className="queue-board__rec-name">{bestRec.name}</span>
              <span className="queue-board__rec-message">{bestRec.recommendation}</span>
            </div>
            <div className="queue-board__rec-wait">
              <span className="queue-board__rec-wait-num">{bestRec.waitMinutes}</span>
              <span className="queue-board__rec-wait-unit">min</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="queue-board__filters">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`queue-board__filter tap-target ${filter === tab.id ? 'active' : ''}`}
            onClick={() => setFilter(tab.id)}
            id={`queue-filter-${tab.id}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Queue Cards */}
      <div className="queue-board__list stagger-children">
        {filteredQueues.map((queue) => {
          const waitChanged = prevWaits[queue.id] !== undefined && prevWaits[queue.id] !== queue.waitMinutes;
          return (
            <div
              key={queue.id}
              className={`queue-board__card glass-card tap-target ${queue.status === 'closed' ? 'closed' : ''}`}
              id={`queue-card-${queue.id}`}
            >
              <div className="queue-board__card-icon">{queue.icon}</div>
              <div className="queue-board__card-info">
                <div className="queue-board__card-name">{queue.name}</div>
                <div className="queue-board__card-meta">
                  <span className={`badge ${getStatusClass(queue.status)}`}>
                    {queue.status}
                  </span>
                  <span className="queue-board__card-trend">
                    {getTrendIcon(queue.trend)} {queue.trend}
                  </span>
                </div>
              </div>
              <div className={`queue-board__card-wait ${waitChanged ? 'changed' : ''}`}>
                <span className="queue-board__card-wait-num">{queue.waitMinutes}</span>
                <span className="queue-board__card-wait-unit">min</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**File: `src/components/QueueBoard/QueueBoard.css`**
```css
.queue-board {
  padding: var(--space-2) var(--space-4);
  animation: fadeInUp var(--duration-enter) var(--ease-out);
}

/* Recommendation Card */
.queue-board__recommendation {
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(124, 58, 237, 0.08));
  border: 1px solid rgba(0, 212, 255, 0.2);
  animation: fadeInScale var(--duration-slow) var(--ease-spring);
}

.queue-board__rec-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.queue-board__rec-icon {
  font-size: 1.2rem;
}

.queue-board__rec-title {
  font-family: var(--font-heading);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.queue-board__rec-body {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.queue-board__rec-emoji {
  font-size: 2rem;
  flex-shrink: 0;
}

.queue-board__rec-info {
  flex: 1;
  min-width: 0;
}

.queue-board__rec-name {
  display: block;
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
  font-size: var(--text-base);
}

.queue-board__rec-message {
  display: block;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: 2px;
}

.queue-board__rec-wait {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.queue-board__rec-wait-num {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-success);
  line-height: 1;
}

.queue-board__rec-wait-unit {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
}

/* Filter Tabs */
.queue-board__filters {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-3);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.queue-board__filters::-webkit-scrollbar {
  display: none;
}

.queue-board__filter {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  white-space: nowrap;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid transparent;
  transition: all var(--duration-fast) var(--ease-spring);
}

.queue-board__filter.active {
  background: rgba(0, 212, 255, 0.1);
  color: var(--accent-primary);
  border-color: rgba(0, 212, 255, 0.3);
}

/* Queue Cards */
.queue-board__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.queue-board__card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
}

.queue-board__card.closed {
  opacity: 0.4;
}

.queue-board__card-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.queue-board__card-info {
  flex: 1;
  min-width: 0;
}

.queue-board__card-name {
  font-weight: var(--weight-semibold);
  font-size: var(--text-base);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-board__card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.queue-board__card-trend {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.queue-board__card-wait {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  min-width: 50px;
  transition: transform var(--duration-normal) var(--ease-spring);
}

.queue-board__card-wait.changed {
  animation: fadeInScale var(--duration-normal) var(--ease-spring);
}

.queue-board__card-wait-num {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  line-height: 1;
}

.queue-board__card-wait-unit {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
}
```

---

#### Component: LiveFeed

**File: `src/components/LiveFeed/LiveFeed.jsx`**
```jsx
/*
 * LiveFeed Component
 * 
 * Real-time event feed showing:
 * - Score updates with special styling
 * - Announcements
 * - Alerts (with colored urgency)
 * - Milestones
 * 
 * New items animate in from top with spring effect.
 * Each item has a time-ago timestamp that auto-updates.
 */

import { useEffect, useState } from 'react';
import { FEED_TYPES, SEVERITY, timeAgo } from '../../utils/constants';
import './LiveFeed.css';

export default function LiveFeed({ feed }) {
  const [, setTick] = useState(0);

  // Update "time ago" every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="live-feed" id="live-feed">
      <div className="live-feed__header">
        <h3 className="live-feed__title">
          <span className="live-dot" /> Live Feed
        </h3>
        <span className="live-feed__count">{feed.length} events</span>
      </div>

      <div className="live-feed__list stagger-children">
        {feed.map((item, index) => {
          const typeConfig = FEED_TYPES[item.type] || FEED_TYPES.announcement;
          const severityConfig = SEVERITY[item.severity] || SEVERITY.info;

          return (
            <div
              key={item.id}
              className={`live-feed__item glass-card ${item.type === 'score' ? 'score-item' : ''} ${item.severity === 'critical' ? 'critical-item' : ''}`}
              id={`feed-item-${item.id}`}
              style={{
                borderLeft: `3px solid ${typeConfig.color}`,
              }}
            >
              <div className="live-feed__item-icon" style={{ background: `${typeConfig.color}20` }}>
                {typeConfig.icon}
              </div>
              <div className="live-feed__item-content">
                <div className="live-feed__item-header">
                  <span className="live-feed__item-title">{item.title}</span>
                  <span className="live-feed__item-time">{timeAgo(item.timestamp)}</span>
                </div>
                <p className="live-feed__item-message">{item.message}</p>
                {item.severity !== 'info' && (
                  <span
                    className="badge"
                    style={{ background: severityConfig.bg, color: severityConfig.color }}
                  >
                    {item.severity}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {feed.length === 0 && (
          <div className="live-feed__empty">
            <span className="live-feed__empty-icon">📡</span>
            <p>Waiting for live updates...</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**File: `src/components/LiveFeed/LiveFeed.css`**
```css
.live-feed {
  padding: var(--space-2) var(--space-4);
  animation: fadeInUp var(--duration-enter) var(--ease-out);
}

.live-feed__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.live-feed__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
}

.live-feed__count {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.live-feed__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.live-feed__item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-left-width: 3px;
  border-left-style: solid;
}

.live-feed__item.score-item {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent);
}

.live-feed__item.critical-item {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), transparent);
  animation: glowPulse 3s ease-in-out infinite;
}

.live-feed__item-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.live-feed__item-content {
  flex: 1;
  min-width: 0;
}

.live-feed__item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: 2px;
}

.live-feed__item-title {
  font-weight: var(--weight-semibold);
  font-size: var(--text-base);
  color: var(--text-primary);
}

.live-feed__item-time {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
}

.live-feed__item-message {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-1);
}

.live-feed__empty {
  text-align: center;
  padding: var(--space-12) var(--space-4);
  color: var(--text-tertiary);
}

.live-feed__empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: var(--space-3);
  animation: float 3s ease-in-out infinite;
}
```

---

#### Component: Toast

**File: `src/components/Toast/Toast.jsx`**
```jsx
/*
 * Toast Component
 * 
 * Floating notification that appears at the top of the screen.
 * - Slides in from top with spring animation
 * - Auto-dismisses after 5s (8s for critical)
 * - Swipe to dismiss (future enhancement)
 * - Stacks multiple toasts vertically
 */

import { SEVERITY } from '../../utils/constants';
import './Toast.css';

export default function Toast({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast, index) => {
        const severity = SEVERITY[toast.severity] || SEVERITY.info;
        return (
          <div
            key={toast.id}
            className="toast glass-card"
            style={{
              borderLeft: `4px solid ${severity.color}`,
              animationDelay: `${index * 100}ms`,
            }}
            onClick={() => onDismiss(toast.id)}
            role="alert"
          >
            <div className="toast__content">
              <div className="toast__title">{toast.title}</div>
              <div className="toast__message">{toast.message}</div>
            </div>
            <button className="toast__close" aria-label="Dismiss">✕</button>
          </div>
        );
      })}
    </div>
  );
}
```

**File: `src/components/Toast/Toast.css`**
```css
.toast-container {
  position: fixed;
  top: calc(var(--header-height) + var(--safe-area-top) + var(--space-2));
  left: var(--space-4);
  right: var(--space-4);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.toast {
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  pointer-events: auto;
  cursor: pointer;
  animation: slideInFromTop var(--duration-slow) var(--ease-spring) forwards;
  border-left-width: 4px;
  border-left-style: solid;
}

@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.toast__content {
  flex: 1;
  min-width: 0;
}

.toast__title {
  font-weight: var(--weight-semibold);
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.toast__message {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toast__close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  flex-shrink: 0;
  transition: background var(--duration-fast) var(--ease-smooth);
}

.toast__close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

---

#### Component: Skeleton

**File: `src/components/Skeleton/Skeleton.jsx`**
```jsx
/*
 * Skeleton Loading Component
 * 
 * Shows animated placeholder UI while data loads.
 * Matches the layout of actual components so there's zero layout shift.
 */

import './Skeleton.css';

export function SkeletonCard({ count = 3 }) {
  return (
    <div className="skeleton-cards">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card glass-card" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="skeleton skeleton--circle" />
          <div className="skeleton-card__content">
            <div className="skeleton skeleton--title" />
            <div className="skeleton skeleton--text" />
          </div>
          <div className="skeleton skeleton--badge" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMap() {
  return (
    <div className="skeleton-map">
      <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: 'var(--radius-xl)' }} />
      <div className="skeleton-map__legend">
        <div className="skeleton" style={{ width: '60px', height: '12px' }} />
        <div className="skeleton" style={{ width: '80px', height: '12px' }} />
        <div className="skeleton" style={{ width: '50px', height: '12px' }} />
        <div className="skeleton" style={{ width: '70px', height: '12px' }} />
      </div>
    </div>
  );
}

export default SkeletonCard;
```

**File: `src/components/Skeleton/Skeleton.css`**
```css
.skeleton-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}

.skeleton-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  animation: fadeInUp var(--duration-enter) var(--ease-out) forwards;
  opacity: 0;
}

.skeleton-card__content {
  flex: 1;
}

.skeleton--badge {
  width: 50px;
  height: 30px;
  border-radius: var(--radius-sm);
}

.skeleton-map {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.skeleton-map__legend {
  display: flex;
  gap: var(--space-4);
}
```

---

#### Component: ZoneDetail

**File: `src/components/ZoneDetail/ZoneDetail.jsx`**
```jsx
/*
 * ZoneDetail Component
 * 
 * Bottom sheet modal that appears when a zone is tapped on the map.
 * Shows: zone name, density, trend, capacity, nearby queues.
 * Slides up from bottom with spring animation.
 * Tap backdrop or X to close.
 */

import { getDensityInfo } from '../../utils/constants';
import './ZoneDetail.css';

export default function ZoneDetail({ zone, queues, onClose }) {
  if (!zone) return null;

  const densityInfo = getDensityInfo(zone.density);
  const nearbyQueues = queues.filter((q) => q.zone === zone.id);

  return (
    <div className="zone-detail__overlay" onClick={onClose} id="zone-detail-overlay">
      <div className="zone-detail glass-card" onClick={(e) => e.stopPropagation()} id="zone-detail-sheet">
        <div className="zone-detail__handle" />
        
        <button className="zone-detail__close" onClick={onClose} aria-label="Close">✕</button>

        <div className="zone-detail__header">
          <h3 className="zone-detail__name">{zone.name}</h3>
          <span className="badge" style={{ background: densityInfo.bg, color: densityInfo.color }}>
            {densityInfo.label} — {zone.density}%
          </span>
        </div>

        {/* Density bar */}
        <div className="zone-detail__density-bar">
          <div className="zone-detail__density-fill" style={{
            width: `${zone.density}%`,
            background: densityInfo.color,
          }} />
        </div>

        {/* Stats */}
        <div className="zone-detail__stats">
          <div className="zone-detail__stat">
            <span className="zone-detail__stat-value">{zone.currentCount?.toLocaleString()}</span>
            <span className="zone-detail__stat-label">People</span>
          </div>
          <div className="zone-detail__stat">
            <span className="zone-detail__stat-value">{zone.capacity?.toLocaleString()}</span>
            <span className="zone-detail__stat-label">Capacity</span>
          </div>
          <div className="zone-detail__stat">
            <span className="zone-detail__stat-value">
              {zone.trend === 'rising' ? '📈' : zone.trend === 'falling' ? '📉' : '➡️'}
            </span>
            <span className="zone-detail__stat-label">{zone.trend}</span>
          </div>
        </div>

        {/* Nearby Queues */}
        {nearbyQueues.length > 0 && (
          <div className="zone-detail__queues">
            <h4 className="zone-detail__queues-title">Nearby</h4>
            {nearbyQueues.map((q) => (
              <div key={q.id} className="zone-detail__queue-item">
                <span>{q.icon}</span>
                <span className="zone-detail__queue-name">{q.name}</span>
                <span className="zone-detail__queue-wait">{q.waitMinutes} min</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**File: `src/components/ZoneDetail/ZoneDetail.css`**
```css
.zone-detail__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn var(--duration-fast) var(--ease-smooth);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.zone-detail {
  width: 100%;
  max-width: var(--content-max-width);
  max-height: 70vh;
  padding: var(--space-2) var(--space-6) var(--space-8);
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  animation: slideInBottom var(--duration-slow) var(--ease-spring);
  overflow-y: auto;
  position: relative;
}

.zone-detail__handle {
  width: 36px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--text-tertiary);
  margin: 0 auto var(--space-4);
  opacity: 0.5;
}

.zone-detail__close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-secondary);
  transition: background var(--duration-fast) var(--ease-smooth);
}

.zone-detail__close:hover {
  background: var(--bg-hover);
}

.zone-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.zone-detail__name {
  font-size: var(--text-xl);
}

.zone-detail__density-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-5);
}

.zone-detail__density-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 1s var(--ease-smooth), background 0.5s var(--ease-smooth);
}

.zone-detail__stats {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.zone-detail__stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.zone-detail__stat-value {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
}

.zone-detail__stat-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: capitalize;
}

.zone-detail__queues {
  margin-top: var(--space-2);
}

.zone-detail__queues-title {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.zone-detail__queue-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--glass-border);
}

.zone-detail__queue-item:last-child {
  border-bottom: none;
}

.zone-detail__queue-name {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.zone-detail__queue-wait {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--accent-primary);
  font-weight: var(--weight-semibold);
}
```

---

#### Component: PWAPrompt

**File: `src/components/PWAPrompt/PWAPrompt.jsx`**
```jsx
/*
 * PWAPrompt Component
 * 
 * Shows a banner at the bottom prompting the user to install the app.
 * Only shown when:
 * - The browser supports PWA install
 * - The app is not already installed
 * - The user hasn't dismissed it in this session
 */

import { useState } from 'react';
import './PWAPrompt.css';

export default function PWAPrompt({ canInstall, onInstall }) {
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="pwa-prompt glass-card" id="pwa-install-prompt">
      <div className="pwa-prompt__content">
        <span className="pwa-prompt__icon">📲</span>
        <div className="pwa-prompt__text">
          <strong>Install VenueFlow</strong>
          <span>Add to home screen for the best experience</span>
        </div>
      </div>
      <div className="pwa-prompt__actions">
        <button className="pwa-prompt__dismiss" onClick={() => setDismissed(true)}>
          Later
        </button>
        <button className="pwa-prompt__install" onClick={onInstall}>
          Install
        </button>
      </div>
    </div>
  );
}
```

**File: `src/components/PWAPrompt/PWAPrompt.css`**
```css
.pwa-prompt {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + var(--safe-area-bottom) + var(--space-3));
  left: var(--space-4);
  right: var(--space-4);
  max-width: var(--content-max-width);
  margin: 0 auto;
  z-index: var(--z-overlay);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  animation: slideInBottom var(--duration-slow) var(--ease-spring);
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(124, 58, 237, 0.1));
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.pwa-prompt__content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.pwa-prompt__icon {
  font-size: 1.8rem;
  flex-shrink: 0;
}

.pwa-prompt__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pwa-prompt__text strong {
  font-size: var(--text-base);
  color: var(--text-primary);
}

.pwa-prompt__text span {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.pwa-prompt__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.pwa-prompt__dismiss {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
}

.pwa-prompt__install {
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  background: var(--accent-gradient);
  color: white;
  transition: transform var(--duration-fast) var(--ease-spring),
              box-shadow var(--duration-fast) var(--ease-smooth);
}

.pwa-prompt__install:hover {
  transform: scale(1.02);
  box-shadow: var(--accent-glow);
}

.pwa-prompt__install:active {
  transform: scale(0.97);
}
```

---

#### Component: AdminPanel

**File: `src/components/AdminPanel/AdminPanel.jsx`**
```jsx
/*
 * AdminPanel Component
 * 
 * Admin dashboard accessible via the "More" tab.
 * Features:
 * - Post announcements/alerts
 * - Update match score
 * - View live stats (attendance, avg density, avg wait)
 * - Quick actions for queue management
 */

import { useState } from 'react';
import api from '../../utils/api';
import './AdminPanel.css';

export default function AdminPanel({ venue, stats, matchClock, queues, emit, addToast }) {
  const [alertForm, setAlertForm] = useState({
    type: 'announcement',
    title: '',
    message: '',
    severity: 'info',
  });
  const [sending, setSending] = useState(false);

  const score = matchClock?.score || {
    home: { name: venue?.match?.homeTeam?.shortName || 'HOME', score: venue?.match?.homeTeam?.score || 0 },
    away: { name: venue?.match?.awayTeam?.shortName || 'AWAY', score: venue?.match?.awayTeam?.score || 0 },
  };

  const handlePostAlert = async (e) => {
    e.preventDefault();
    if (!alertForm.title || !alertForm.message) return;
    setSending(true);
    const res = await api.postFeed(alertForm);
    if (res.success) {
      setAlertForm({ type: 'announcement', title: '', message: '', severity: 'info' });
      addToast?.({ title: 'Sent!', message: 'Announcement posted successfully', severity: 'info' });
    }
    setSending(false);
  };

  const handleScoreUpdate = (team, delta) => {
    const newScore = {
      home: score.home.score,
      away: score.away.score,
    };
    if (team === 'home') newScore.home = Math.max(0, newScore.home + delta);
    if (team === 'away') newScore.away = Math.max(0, newScore.away + delta);
    emit('admin:updateScore', newScore);
  };

  return (
    <div className="admin-panel" id="admin-panel">
      <h2 className="admin-panel__title">⚙️ Admin Dashboard</h2>

      {/* Stats Overview */}
      <div className="admin-panel__stats">
        <div className="admin-panel__stat glass-card">
          <span className="admin-panel__stat-icon">👥</span>
          <span className="admin-panel__stat-value">{stats?.totalAttendance?.toLocaleString() || '—'}</span>
          <span className="admin-panel__stat-label">Attendance</span>
        </div>
        <div className="admin-panel__stat glass-card">
          <span className="admin-panel__stat-icon">📊</span>
          <span className="admin-panel__stat-value">{stats?.avgDensity || '—'}%</span>
          <span className="admin-panel__stat-label">Avg Density</span>
        </div>
        <div className="admin-panel__stat glass-card">
          <span className="admin-panel__stat-icon">⏱️</span>
          <span className="admin-panel__stat-value">{stats?.avgWaitTime || '—'}m</span>
          <span className="admin-panel__stat-label">Avg Wait</span>
        </div>
        <div className="admin-panel__stat glass-card">
          <span className="admin-panel__stat-icon">🟢</span>
          <span className="admin-panel__stat-value">{stats?.openQueues || '—'}/{stats?.totalQueues || '—'}</span>
          <span className="admin-panel__stat-label">Open Queues</span>
        </div>
      </div>

      {/* Score Control */}
      <div className="admin-panel__section glass-card">
        <h3>Match Score</h3>
        <div className="admin-panel__score-control">
          <div className="admin-panel__score-team">
            <span>{score.home.name}</span>
            <div className="admin-panel__score-btns">
              <button className="admin-panel__btn tap-target" onClick={() => handleScoreUpdate('home', -1)}>−</button>
              <span className="admin-panel__score-num">{score.home.score}</span>
              <button className="admin-panel__btn tap-target" onClick={() => handleScoreUpdate('home', 1)}>+</button>
            </div>
          </div>
          <span className="admin-panel__score-vs">vs</span>
          <div className="admin-panel__score-team">
            <span>{score.away.name}</span>
            <div className="admin-panel__score-btns">
              <button className="admin-panel__btn tap-target" onClick={() => handleScoreUpdate('away', -1)}>−</button>
              <span className="admin-panel__score-num">{score.away.score}</span>
              <button className="admin-panel__btn tap-target" onClick={() => handleScoreUpdate('away', 1)}>+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Post Announcement */}
      <form className="admin-panel__section glass-card" onSubmit={handlePostAlert}>
        <h3>Post Announcement</h3>
        <div className="admin-panel__form-row">
          <select
            value={alertForm.type}
            onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })}
            id="alert-type-select"
          >
            <option value="announcement">📢 Announcement</option>
            <option value="alert">🚨 Alert</option>
            <option value="milestone">🎉 Milestone</option>
            <option value="score">⚽ Score</option>
          </select>
          <select
            value={alertForm.severity}
            onChange={(e) => setAlertForm({ ...alertForm, severity: e.target.value })}
            id="alert-severity-select"
          >
            <option value="info">ℹ️ Info</option>
            <option value="warning">⚠️ Warning</option>
            <option value="critical">🔴 Critical</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Title"
          value={alertForm.title}
          onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
          id="alert-title-input"
          required
        />
        <textarea
          placeholder="Message..."
          rows={3}
          value={alertForm.message}
          onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
          id="alert-message-input"
          required
        />
        <button type="submit" className="admin-panel__submit tap-target" disabled={sending} id="alert-submit-btn">
          {sending ? 'Sending...' : '📡 Broadcast'}
        </button>
      </form>
    </div>
  );
}
```

**File: `src/components/AdminPanel/AdminPanel.css`**
```css
.admin-panel {
  padding: var(--space-2) var(--space-4);
  animation: fadeInUp var(--duration-enter) var(--ease-out);
}

.admin-panel__title {
  margin-bottom: var(--space-5);
  font-size: var(--text-2xl);
}

/* Stats Grid */
.admin-panel__stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.admin-panel__stat {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  text-align: center;
}

.admin-panel__stat-icon {
  font-size: 1.5rem;
}

.admin-panel__stat-value {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--accent-primary);
}

.admin-panel__stat-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Sections */
.admin-panel__section {
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.admin-panel__section h3 {
  margin-bottom: var(--space-4);
  font-size: var(--text-lg);
}

/* Score Control */
.admin-panel__score-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
}

.admin-panel__score-team {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-weight: var(--weight-semibold);
}

.admin-panel__score-btns {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.admin-panel__btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--text-primary);
  transition: background var(--duration-fast) var(--ease-smooth);
}

.admin-panel__btn:hover {
  background: var(--bg-hover);
}

.admin-panel__score-num {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  min-width: 32px;
  text-align: center;
}

.admin-panel__score-vs {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

/* Form */
.admin-panel__form-row {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.admin-panel__form-row select {
  flex: 1;
}

.admin-panel__section input,
.admin-panel__section textarea {
  width: 100%;
  margin-bottom: var(--space-3);
}

.admin-panel__section textarea {
  resize: vertical;
  min-height: 60px;
}

.admin-panel__submit {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--accent-gradient);
  color: white;
  font-weight: var(--weight-semibold);
  font-size: var(--text-base);
  transition: transform var(--duration-fast) var(--ease-spring),
              opacity var(--duration-fast) var(--ease-smooth);
}

.admin-panel__submit:hover {
  transform: scale(1.01);
}

.admin-panel__submit:active {
  transform: scale(0.98);
}

.admin-panel__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

### STEP 9: Create Main App Files

**File: `src/main.jsx`**
```jsx
/*
 * Application Entry Point
 * 
 * Renders the root React component and registers the PWA service worker.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed — app still works
    });
  });
}
```

**File: `src/App.jsx`**
```jsx
/*
 * Root Application Component
 * 
 * Layout:
 * - Fixed Header (score bar)
 * - Scrollable content area (switches between tabs)
 * - Fixed BottomNav
 * - Floating Toast notifications
 * - PWA install prompt
 * - Zone detail bottom sheet
 * 
 * State management: useVenueData hook (single source of truth)
 * Tab routing: simple state-based (no router needed for 4 views)
 */

import { useState } from 'react';
import { useVenueData } from './hooks/useVenueData';
import { usePWA } from './hooks/usePWA';
import { TABS } from './utils/constants';

import Header from './components/Header/Header';
import BottomNav from './components/BottomNav/BottomNav';
import VenueMap from './components/VenueMap/VenueMap';
import QueueBoard from './components/QueueBoard/QueueBoard';
import LiveFeed from './components/LiveFeed/LiveFeed';
import AdminPanel from './components/AdminPanel/AdminPanel';
import Toast from './components/Toast/Toast';
import ZoneDetail from './components/ZoneDetail/ZoneDetail';
import PWAPrompt from './components/PWAPrompt/PWAPrompt';
import { SkeletonCard, SkeletonMap } from './components/Skeleton/Skeleton';

import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS.MAP);
  const [selectedZone, setSelectedZone] = useState(null);

  const {
    venue, zones, queues, feed, stats, matchClock,
    isConnected, isLoading, toasts,
    dismissToast, emit, addToast,
  } = useVenueData();

  const { canInstall, promptInstall } = usePWA();

  const renderContent = () => {
    if (isLoading) {
      return activeTab === TABS.MAP ? <SkeletonMap /> : <SkeletonCard count={5} />;
    }

    switch (activeTab) {
      case TABS.MAP:
        return (
          <VenueMap
            zones={zones}
            queues={queues}
            onZoneSelect={setSelectedZone}
          />
        );
      case TABS.QUEUES:
        return <QueueBoard queues={queues} />;
      case TABS.FEED:
        return <LiveFeed feed={feed} />;
      case TABS.MORE:
        return (
          <AdminPanel
            venue={venue}
            stats={stats}
            matchClock={matchClock}
            queues={queues}
            emit={emit}
            addToast={addToast}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app" id="app-root">
      <Header
        venue={venue}
        matchClock={matchClock}
        isConnected={isConnected}
      />

      <main className="app__content scroll-container">
        {renderContent()}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <Toast toasts={toasts} onDismiss={dismissToast} />

      <ZoneDetail
        zone={selectedZone}
        queues={queues}
        onClose={() => setSelectedZone(null)}
      />

      <PWAPrompt canInstall={canInstall} onInstall={promptInstall} />
    </div>
  );
}
```

**File: `src/App.css`**
```css
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.app__content {
  flex: 1;
  margin-top: var(--header-height);
  padding-bottom: calc(var(--bottom-nav-height) + var(--safe-area-bottom) + var(--space-4));
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* Desktop layout — side nav instead of bottom */
@media (min-width: 1024px) {
  .app {
    flex-direction: row;
  }

  .app__content {
    margin-top: var(--header-height);
    padding-bottom: var(--space-8);
    max-width: var(--content-max-width);
    margin-left: auto;
    margin-right: auto;
    width: 100%;
  }
}
```

---

## VERIFICATION CHECKLIST

After building all files, verify:

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Start dev server
npm run dev
# Should open at http://localhost:5173

# 3. Visual checks (open Chrome DevTools → Mobile viewport)
# - [ ] Dark background loads immediately (no white flash)
# - [ ] Google Fonts load (Inter, Space Grotesk)
# - [ ] Header shows match score and live indicator
# - [ ] Bottom nav has 4 tabs with active indicator
# - [ ] Map tab shows SVG stadium with colored zones
# - [ ] Queues tab shows cards with wait times
# - [ ] Feed tab shows event items
# - [ ] More tab shows admin panel

# 4. Real-time checks (backend must be running on :3001)
# - [ ] Zone colors update every 5 seconds
# - [ ] Queue wait times change
# - [ ] New feed items appear at top
# - [ ] Toast notifications show for goals/alerts

# 5. PWA checks
# - [ ] Lighthouse PWA audit passes (Chrome DevTools → Lighthouse)
# - [ ] "Install App" banner appears on supported browsers
# - [ ] App works offline with cached data (service worker)

# 6. Animation checks
# - [ ] Cards animate in with stagger effect
# - [ ] Bottom nav tab switch is smooth
# - [ ] Zone tap opens bottom sheet with spring animation
# - [ ] Toast slides in from top
# - [ ] All tap targets scale down on press

# 7. Build for production
npm run build
npm run preview
# Verify production build works correctly
```

---

## INTEGRATION WITH BACKEND

The frontend connects to the backend in two ways:

### 1. REST API (via Vite proxy in dev)
All `/api/*` requests are proxied to `http://localhost:3001` by `vite.config.js`.
In production, set `VITE_API_URL` environment variable to the backend URL.

### 2. Socket.IO (direct connection)
Socket.IO connects directly to `http://localhost:3001` (configured in `constants.js`).
In production, set `VITE_SOCKET_URL` environment variable.

### Required Backend Endpoints:
| Method | Path | Used By |
|--------|------|---------|
| GET | `/api/venue` | `useVenueData` initial fetch |
| GET | `/api/zones` | `useVenueData` initial fetch |
| GET | `/api/queues` | `useVenueData` initial fetch |
| GET | `/api/queues/recommend?type=` | `QueueBoard` recommendations |
| GET | `/api/feed?limit=30` | `useVenueData` initial fetch |
| GET | `/api/stats` | `useVenueData` initial fetch |
| POST | `/api/feed` | `AdminPanel` post announcement |

### Required Socket Events (Server → Client):
| Event | Consumed By |
|-------|-------------|
| `init:state` | `useVenueData` |
| `zone:update` | `useVenueData` → `VenueMap` |
| `queue:update` | `useVenueData` → `QueueBoard` |
| `feed:new` | `useVenueData` → `LiveFeed` |
| `venue:clock` | `useVenueData` → `Header` |
| `alert:broadcast` | `useVenueData` → `Toast` |
| `stats:connections` | `useSocket` |

---

## COMMON ISSUES & FIXES

| Issue | Fix |
|-------|-----|
| White flash on load | The `index.html` has inline CSS setting `background-color: #0a0e1a`. If still flashing, check for CSS import order. |
| Fonts not loading | Verify the Google Fonts link in `index.html`. Check network tab for blocked requests. |
| Map zones not clickable | Check if zone IDs match between backend `store.js` and frontend SVG zone IDs. |
| Animations janky | Reduce stagger count. Use `will-change: transform` on animated elements. Avoid animating `width`/`height` — use `transform: scale()` instead. |
| PWA not installable | Must be served over HTTPS in production. In dev, the `vite-plugin-pwa` handles this. Run `npm run build && npm run preview` to test. |
| Socket not connecting | Verify backend is running on port 3001. Check browser console for CORS errors. |
| Blank page after build | Check `vite.config.js` base path. Should be `/` for root deployment. |
