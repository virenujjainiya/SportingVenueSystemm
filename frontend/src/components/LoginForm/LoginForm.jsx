/*
 * LoginForm Component
 *
 * Clean admin login screen shown in AdminPanel when user is not authenticated.
 * Matches the dark glassmorphism aesthetic of the rest of the app.
 */

import { useState } from 'react';
import './LoginForm.css';

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setLoading(true);
    setError('');
    
    const result = await onLogin(username, password);
    
    if (!result.success) {
      setError(result.error || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="login-form" id="admin-login">
      <div className="login-form__header">
        <div className="login-form__icon">🏟️</div>
        <h2 className="login-form__title">Admin Access</h2>
        <p className="login-form__subtitle">Sign in to manage VenueFlow</p>
      </div>

      <form className="login-form__body glass-card" onSubmit={handleSubmit}>
        {error && (
          <div className="login-form__error" role="alert">
            ⚠️ {error}
          </div>
        )}

        <div className="login-form__field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="login-form__field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="login-form__btn tap-target"
          disabled={loading || !username || !password}
          id="login-submit-btn"
        >
          {loading ? (
            <span className="login-form__spinner">Signing in...</span>
          ) : (
            '🔐 Sign In'
          )}
        </button>
      </form>

      <p className="login-form__hint">Attendees don't need to sign in</p>
    </div>
  );
}
