// Zustand store for live hardware stats.
//
// The store exposes a subscribe() action that starts listening to the
// "stats-update" Tauri event emitted every 500ms by the Rust StatsCollector.
// Callers should invoke subscribe() once on mount and call the returned
// cleanup function on unmount to avoid event listener leaks.

import { listen } from '@tauri-apps/api/event';
import { create } from 'zustand';

import type { SystemStats } from '../types/stats';

/** How many data points to retain in the rolling history (30 s at 500ms) */
const HISTORY_LENGTH = 60;

interface StatsStore {
  /** Latest full stats snapshot, null during the 1s warm-up period */
  current: SystemStats | null;
  /** Rolling history of overall CPU%, newest at the end */
  cpuHistory: number[];
  /** Rolling history of RAM%, newest at the end */
  ramHistory: number[];
  /** Start listening for stats-update events; returns the unlisten function */
  subscribe: () => Promise<() => void>;
}

export const useStatsStore = create<StatsStore>((set, get) => ({
  current: null,
  cpuHistory: [],
  ramHistory: [],

  subscribe: async () => {
    // listen() returns a cleanup function that removes the event listener
    const unlisten = await listen<SystemStats>('stats-update', (event) => {
      const stats = event.payload;
      const prev = get();

      set({
        current: stats,
        // Keep the last (HISTORY_LENGTH - 1) entries and append the new value
        cpuHistory: [
          ...prev.cpuHistory.slice(-(HISTORY_LENGTH - 1)),
          stats.cpu.usage_total,
        ],
        ramHistory: [
          ...prev.ramHistory.slice(-(HISTORY_LENGTH - 1)),
          stats.memory.used_percent,
        ],
      });
    });

    return unlisten;
  },
}));
