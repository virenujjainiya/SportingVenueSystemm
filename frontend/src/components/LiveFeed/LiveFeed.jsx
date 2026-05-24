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
