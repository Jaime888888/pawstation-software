import { useEffect } from 'react';

export function useStatusPolling({ enabled, intervalMs, action }) {
  useEffect(() => {
    if (!enabled || typeof action !== 'function') {
      return undefined;
    }

    const id = setInterval(() => {
      action();
    }, intervalMs);

    return () => clearInterval(id);
  }, [enabled, intervalMs, action]);
}
