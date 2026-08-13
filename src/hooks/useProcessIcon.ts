// Resolve a process's .exe icon (as a data: URI) via the shared cache in
// processIconCache.ts, kicking off a fetch on first render for a new
// exe_path and re-rendering once it resolves.

import { useEffect, useState } from 'react';
import { fetchProcessIcon, getCachedIcon } from '../lib/processIconCache';

/** Returns the icon data URI once known, or null while loading/unavailable. */
export function useProcessIcon(exePath: string): string | null {
  const [icon, setIcon] = useState<string | null>(() => getCachedIcon(exePath) ?? null);

  useEffect(() => {
    // Reset immediately on exe_path change so a DOM row recycled by
    // ProcessTable's virtual scroll doesn't briefly show the previous
    // process's icon before the new one resolves.
    setIcon(getCachedIcon(exePath) ?? null);

    let cancelled = false;
    fetchProcessIcon(exePath).then((result) => {
      if (!cancelled) setIcon(result);
    });
    return () => {
      cancelled = true;
    };
  }, [exePath]);

  return icon;
}
