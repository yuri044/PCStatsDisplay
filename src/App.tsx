// Root application component.
//
// Responsibilities:
//   - Subscribe to the stats stream (once, for the whole app lifetime)
//   - Listen for opacity-change events from Rust
//   - Apply theme from settings
//   - Render the TitleBar + TabBar + active panel
//   - Provide the Toast context

import { listen } from '@tauri-apps/api/event';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { TitleBar } from './components/TitleBar/TitleBar';
import { ProcessPanel } from './components/ProcessPanel/ProcessPanel';
import { StatsPanel } from './components/StatsPanel/StatsPanel';
import { TabBar, type Tab } from './components/shared/TabBar';
import { ToastProvider } from './components/shared/Toast';
import { useStats } from './hooks/useStats';
import { useWindow } from './hooks/useWindow';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  // Start the Tauri event subscription for live stats
  useStats();

  // Sync AOT, opacity, and theme settings with the Tauri window
  useWindow();

  // Listen for opacity-change events emitted by the set_window_opacity Rust command.
  // We apply opacity as a CSS variable on the root element instead of a native call
  // because Tauri 2 doesn't expose a direct per-window opacity setter.
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<number>('set-opacity', (event) => {
      document.documentElement.style.setProperty(
        '--app-opacity',
        String(event.payload)
      );
    }).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, []);

  return (
    <ToastProvider>
      <div className="flex flex-col h-full">
        {/* Frameless custom titlebar with drag region */}
        <TitleBar />

        {/* Stats / Processes tab switcher */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* Panel area — animated cross-fade between tabs */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'stats' ? (
              <motion.div
                key="stats"
                className="absolute inset-0 flex flex-col"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                <StatsPanel />
              </motion.div>
            ) : (
              <motion.div
                key="processes"
                className="absolute inset-0 flex flex-col"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
              >
                <ProcessPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ToastProvider>
  );
}
