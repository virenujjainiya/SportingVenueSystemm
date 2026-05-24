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
