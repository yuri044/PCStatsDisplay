// Hook: sync settings store changes with the actual Tauri window state.
// Watches AOT and opacity settings and calls the corresponding Rust commands
// whenever they change.

import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';

import { useSettingsStore } from '../store/settingsStore';

export function useWindow() {
  const { alwaysOnTop, opacity, theme } = useSettingsStore();

  // Sync always-on-top state with Rust whenever it changes in the store
  useEffect(() => {
    invoke('set_always_on_top', { enabled: alwaysOnTop }).catch(console.error);
  }, [alwaysOnTop]);

  // Sync opacity — the Rust command emits a "set-opacity" event back to CSS
  useEffect(() => {
    invoke('set_window_opacity', { opacity }).catch(console.error);
  }, [opacity]);

  // Apply theme class on the root element so CSS variables switch immediately
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
}
