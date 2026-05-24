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
