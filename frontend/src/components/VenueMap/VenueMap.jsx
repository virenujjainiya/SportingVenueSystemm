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
