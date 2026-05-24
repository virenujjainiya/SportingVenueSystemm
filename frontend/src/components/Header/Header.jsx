/*
 * Header Component
 * 
 * Displays:
 * - Live match score with team logos
 * - Match clock (auto-updating)
 * - Connection status indicator
 * - Venue name
 * 
 * Fixed at top of screen. Glassmorphism background.
 * Must feel premium — this is the first thing users see.
 */

import { useMemo } from 'react';
import './Header.css';

export default function Header({ venue, matchClock, isConnected }) {
  const score = useMemo(() => {
    if (matchClock?.score) return matchClock.score;
    if (venue?.match) {
      return {
        home: { name: venue.match.homeTeam.shortName, score: venue.match.homeTeam.score },
        away: { name: venue.match.awayTeam.shortName, score: venue.match.awayTeam.score },
      };
    }
    return null;
  }, [matchClock, venue]);

  const clock = matchClock?.clock || venue?.match?.clock || '--:--';
  const status = matchClock?.status || venue?.status || 'upcoming';
  const half = matchClock?.half || venue?.match?.half || 1;

  return (
    <header className="header safe-area-top" id="main-header">
      <div className="header__inner">
        {/* Live indicator */}
        <div className="header__status">
          <div className={`header__connection ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="header__connection-dot" />
            <span className="header__connection-text">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Score display */}
        {score && (
          <div className="header__score">
            <div className="header__team header__team--home">
              <span className="header__team-logo">{venue?.match?.homeTeam?.logo || '⚡'}</span>
              <span className="header__team-name">{score.home.name}</span>
              <span className="header__team-score">{score.home.score}</span>
            </div>

            <div className="header__clock-container">
              <div className={`header__clock ${status === 'live' ? 'header__clock--live' : ''}`}>
                {clock}
              </div>
              <div className="header__half">
                {status === 'halftime' ? 'HT' : status === 'ended' ? 'FT' : `H${half}`}
              </div>
            </div>

            <div className="header__team header__team--away">
              <span className="header__team-score">{score.away.score}</span>
              <span className="header__team-name">{score.away.name}</span>
              <span className="header__team-logo">{venue?.match?.awayTeam?.logo || '🔥'}</span>
            </div>
          </div>
        )}

        {/* Venue name */}
        <div className="header__venue-name">{venue?.name || 'Loading...'}</div>
      </div>
    </header>
  );
}
