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
