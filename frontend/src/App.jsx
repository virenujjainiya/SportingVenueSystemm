/*
 * Root Application Component
 *
 * Layout:
 * - Fixed Header (score bar + connection status)
 * - Scrollable content area (switches between tabs)
 * - Fixed BottomNav
 * - Floating Toast notifications
 * - PWA install prompt
 * - Zone detail bottom sheet
 *
 * State management:
 * - useVenueData hook — single source of truth for all venue data
 * - useAuth hook — admin authentication state
 * Tab routing: simple state-based (no router needed for 4 views)
 */

import { useState } from 'react';
import { useVenueData } from './hooks/useVenueData';
import { usePWA } from './hooks/usePWA';
import { useAuth } from './hooks/useAuth';
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

  // ── Venue Data (real-time via Socket.IO + REST) ──────────────
  const {
    venue, zones, queues, feed, stats, matchClock,
    isConnected, isLoading, toasts,
    dismissToast, emit, addToast,
  } = useVenueData();

  // ── Admin Auth ───────────────────────────────────────────────
  const { isAdmin, user, authLoading, login, logout } = useAuth();

  // ── PWA Install ───────────────────────────────────────────────
  const { canInstall, promptInstall } = usePWA();

  // ── Render active tab content ─────────────────────────────────
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
            isAdmin={isAdmin}
            user={user}
            onLogin={login}
            onLogout={logout}
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
