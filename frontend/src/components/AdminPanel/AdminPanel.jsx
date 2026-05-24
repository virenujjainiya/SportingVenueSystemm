/*
 * AdminPanel Component
 *
 * Admin dashboard accessible via the "More" tab.
 * Shows login form if not authenticated, dashboard if logged in.
 *
 * Features:
 * - JWT login / logout
 * - Post announcements/alerts (auth protected)
 * - Update match score via WebSocket
 * - View live stats (attendance, avg density, avg wait)
 */

import { useState } from 'react';
import api from '../../utils/api';
import LoginForm from '../LoginForm/LoginForm';
import './AdminPanel.css';

export default function AdminPanel({ venue, stats, matchClock, queues, emit, addToast, isAdmin, user, onLogin, onLogout }) {
  const [alertForm, setAlertForm] = useState({
    type: 'announcement',
    title: '',
    message: '',
    severity: 'info',
  });
  const [sending, setSending] = useState(false);

  const score = matchClock?.score || {
    home: { name: venue?.match?.homeTeam?.shortName || 'HOME', score: venue?.match?.homeTeam?.score ?? 0 },
    away: { name: venue?.match?.awayTeam?.shortName || 'AWAY', score: venue?.match?.awayTeam?.score ?? 0 },
  };

  // ── Not logged in → Show login form ──────────────────────────
  if (!isAdmin) {
    return <LoginForm onLogin={onLogin} />;
  }

  // ── Post announcement ─────────────────────────────────────────
  const handlePostAlert = async (e) => {
    e.preventDefault();
    if (!alertForm.title || !alertForm.message) return;
    setSending(true);

    const res = await api.postFeed(alertForm);

    if (res.success) {
      setAlertForm({ type: 'announcement', title: '', message: '', severity: 'info' });
      addToast?.({ title: 'Sent!', message: 'Announcement posted successfully', severity: 'success' });
    } else if (res.code === 'TOKEN_EXPIRED' || res.status === 401) {
      addToast?.({ title: 'Session expired', message: 'Please sign in again.', severity: 'warning' });
      onLogout?.();
    } else if (res.errors?.length > 0) {
      addToast?.({ title: 'Validation error', message: res.errors.join(', '), severity: 'warning' });
    } else {
      addToast?.({ title: 'Error', message: res.error || 'Failed to post announcement', severity: 'error' });
    }
    setSending(false);
  };

  // ── Score control ─────────────────────────────────────────────
  const handleScoreUpdate = (team, delta) => {
    const newScore = {
      home: score.home.score,
      away: score.away.score,
    };
    if (team === 'home') newScore.home = Math.max(0, newScore.home + delta);
    if (team === 'away') newScore.away = Math.max(0, newScore.away + delta);
    emit('admin:updateScore', newScore);
    addToast?.({ title: 'Score updated', message: `${newScore.home} – ${newScore.away}`, severity: 'info' });
  };

  return (
    <div className="admin-panel" id="admin-panel">
      {/* Admin header with logout */}
      <div className="admin-panel__header">
        <h2 className="admin-panel__title">⚙️ Admin Dashboard</h2>
        <div className="admin-panel__user">
          <span className="admin-panel__user-name">👤 {user?.displayName || user?.username || 'Admin'}</span>
          <button
            className="admin-panel__logout-btn tap-target"
            onClick={onLogout}
            id="admin-logout-btn"
          >
            Sign Out
          </button>
        </div>
      </div>

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
              <button className="admin-panel__btn tap-target" onClick={() => handleScoreUpdate('home', -1)} id="home-score-minus">−</button>
              <span className="admin-panel__score-num">{score.home.score}</span>
              <button className="admin-panel__btn admin-panel__btn--plus tap-target" onClick={() => handleScoreUpdate('home', 1)} id="home-score-plus">+</button>
            </div>
          </div>
          <span className="admin-panel__score-vs">vs</span>
          <div className="admin-panel__score-team">
            <span>{score.away.name}</span>
            <div className="admin-panel__score-btns">
              <button className="admin-panel__btn tap-target" onClick={() => handleScoreUpdate('away', -1)} id="away-score-minus">−</button>
              <span className="admin-panel__score-num">{score.away.score}</span>
              <button className="admin-panel__btn admin-panel__btn--plus tap-target" onClick={() => handleScoreUpdate('away', 1)} id="away-score-plus">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Post Announcement */}
      <form className="admin-panel__section glass-card" onSubmit={handlePostAlert}>
        <h3>📡 Broadcast Message</h3>
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
          maxLength={100}
        />
        <textarea
          placeholder="Message..."
          rows={3}
          value={alertForm.message}
          onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
          id="alert-message-input"
          required
          maxLength={500}
        />
        <button
          type="submit"
          className="admin-panel__submit tap-target"
          disabled={sending || !alertForm.title || !alertForm.message}
          id="alert-submit-btn"
        >
          {sending ? '⏳ Sending...' : '📡 Broadcast'}
        </button>
      </form>
    </div>
  );
}
