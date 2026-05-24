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
