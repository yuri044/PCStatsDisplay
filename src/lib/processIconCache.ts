// Module-level cache for per-process .exe icons, fetched lazily via the
// get_process_icon Tauri command. Kept outside React state so every
// ProcessRow sharing an exe_path (svchost.exe, etc.) shares one cache entry
// and, while a fetch is in flight, one invoke() call.

import { invoke } from '@tauri-apps/api/core';

const cache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

/** Synchronous cache peek — undefined means "not fetched yet". */
export function getCachedIcon(exePath: string): string | null | undefined {
  return cache.get(exePath);
}

/** Fetch (or reuse a cached/in-flight fetch of) the icon for an exe path. */
export function fetchProcessIcon(exePath: string): Promise<string | null> {
  if (!exePath) return Promise.resolve(null);

  const cached = cache.get(exePath);
  if (cached !== undefined) return Promise.resolve(cached);

  const existing = inFlight.get(exePath);
  if (existing) return existing;

  const promise = invoke<string | null>('get_process_icon', { exePath })
    .catch(() => null)
    .then((icon) => {
      cache.set(exePath, icon);
      inFlight.delete(exePath);
      return icon;
    });

  inFlight.set(exePath, promise);
  return promise;
}
