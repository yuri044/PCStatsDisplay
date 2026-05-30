// Hook: subscribe to the live stats stream on mount, clean up on unmount.
// Components should call this hook once at the top level (App.tsx or StatsPanel).

import { useEffect } from 'react';

import { useStatsStore } from '../store/statsStore';

export function useStats() {
  const { subscribe, current, cpuHistory, ramHistory } = useStatsStore();

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    // Start listening to "stats-update" events from Rust
    subscribe().then((fn) => {
      unlisten = fn;
    });

    // Remove the event listener when the component unmounts
    return () => {
      unlisten?.();
    };
  }, [subscribe]);

  return { current, cpuHistory, ramHistory };
}
