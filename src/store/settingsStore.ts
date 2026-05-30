// Zustand store for user preferences, persisted to localStorage.
//
// Settings are persisted across sessions via the zustand/middleware persist
// middleware. Window-level settings (AOT, opacity) are applied immediately
// by invoking the corresponding Tauri commands.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VisibleSections {
  cpu: boolean;
  memory: boolean;
  gpu: boolean;
  disk: boolean;
  network: boolean;
}

interface SettingsStore {
  alwaysOnTop: boolean;
  /** Overall window opacity, 0.1–1.0 */
  opacity: number;
  theme: 'dark' | 'light';
  autostart: boolean;
  /** Which sensor sections are shown in the stats panel */
  visibleSections: VisibleSections;

  setAlwaysOnTop: (enabled: boolean) => void;
  setOpacity: (value: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAutostart: (enabled: boolean) => void;
  toggleSection: (key: keyof VisibleSections) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      alwaysOnTop: true,
      opacity: 0.92,
      theme: 'dark',
      autostart: false,
      visibleSections: {
        cpu: true,
        memory: true,
        gpu: true,
        disk: true,
        network: true,
      },

      setAlwaysOnTop: (enabled) => set({ alwaysOnTop: enabled }),
      setOpacity: (value) => set({ opacity: value }),
      setTheme: (theme) => set({ theme }),
      setAutostart: (enabled) => set({ autostart: enabled }),
      toggleSection: (key) =>
        set((s) => ({
          visibleSections: {
            ...s.visibleSections,
            [key]: !s.visibleSections[key],
          },
        })),
    }),
    {
      name: 'pc-monitor-settings', // localStorage key
    }
  )
);
