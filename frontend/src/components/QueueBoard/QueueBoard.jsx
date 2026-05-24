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
