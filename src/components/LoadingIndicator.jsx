import { createPortal } from 'react-dom';

export function LoadingIndicator({ variant, leaving = false }) {
  if (!variant) return null;

  return createPortal(
    <div className={`loading-indicator loading-indicator--${variant}${leaving ? ' loading-indicator--leaving' : ''}`} role="status" aria-live="polite" aria-label="Loading">
      <span className="loading-spinner" aria-hidden="true" />
    </div>,
    document.body,
  );
}
