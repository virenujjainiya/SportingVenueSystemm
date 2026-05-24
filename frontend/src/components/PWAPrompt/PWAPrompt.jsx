/*
 * PWAPrompt Component
 * 
 * Shows a banner at the bottom prompting the user to install the app.
 * Only shown when:
 * - The browser supports PWA install
 * - The app is not already installed
 * - The user hasn't dismissed it in this session
 */

import { useState } from 'react';
import './PWAPrompt.css';

export default function PWAPrompt({ canInstall, onInstall }) {
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="pwa-prompt glass-card" id="pwa-install-prompt">
      <div className="pwa-prompt__content">
        <span className="pwa-prompt__icon">📲</span>
        <div className="pwa-prompt__text">
          <strong>Install VenueFlow</strong>
          <span>Add to home screen for the best experience</span>
        </div>
      </div>
      <div className="pwa-prompt__actions">
        <button className="pwa-prompt__dismiss" onClick={() => setDismissed(true)}>
          Later
        </button>
        <button className="pwa-prompt__install" onClick={onInstall}>
          Install
        </button>
      </div>
    </div>
  );
}
