/*
 * Toast Component
 * 
 * Floating notification that appears at the top of the screen.
 * - Slides in from top with spring animation
 * - Auto-dismisses after 5s (8s for critical)
 * - Swipe to dismiss (future enhancement)
 * - Stacks multiple toasts vertically
 */

import { SEVERITY } from '../../utils/constants';
import './Toast.css';

export default function Toast({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast, index) => {
        const severity = SEVERITY[toast.severity] || SEVERITY.info;
        return (
          <div
            key={toast.id}
            className="toast glass-card"
            style={{
              borderLeft: `4px solid ${severity.color}`,
              animationDelay: `${index * 100}ms`,
            }}
            onClick={() => onDismiss(toast.id)}
            role="alert"
          >
            <div className="toast__content">
              <div className="toast__title">{toast.title}</div>
              <div className="toast__message">{toast.message}</div>
            </div>
            <button className="toast__close" aria-label="Dismiss">✕</button>
          </div>
        );
      })}
    </div>
  );
}
