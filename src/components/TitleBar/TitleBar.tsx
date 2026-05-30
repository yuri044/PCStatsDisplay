// Custom frameless titlebar.
//
// Because Tauri is configured with `decorations: false`, we render our own
// drag region and window control buttons.
// `data-tauri-drag-region` on the container div instructs Tauri's WebView
// to treat pointer-down events on that element as window drag initiation.

import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../../store/settingsStore';

/** CPU icon used in the title — keeps it recognizable in the taskbar */
const APP_ICON = '⚡';

export function TitleBar() {
  const win = getCurrentWindow();
  const { alwaysOnTop, setAlwaysOnTop } = useSettingsStore();

  // Toggle AOT and persist to settings + Rust
  const handleAotToggle = () => {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    invoke('set_always_on_top', { enabled: next }).catch(console.error);
  };

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between px-3 py-1.5 select-none"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        minHeight: '32px',
      }}
    >
      {/* App identity */}
      <span
        className="text-xs font-semibold tracking-widest"
        style={{ color: 'var(--text-secondary)', letterSpacing: '0.12em' }}
      >
        {APP_ICON} PC MONITOR
      </span>

      {/* Window controls — must stop propagation so drag doesn't trigger */}
      <div
        className="flex items-center gap-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Always-on-top toggle */}
        <button
          title={alwaysOnTop ? 'Disable always on top' : 'Enable always on top'}
          onClick={handleAotToggle}
          className="w-5 h-5 rounded flex items-center justify-center text-xs transition-colors"
          style={{
            background: alwaysOnTop ? 'rgba(59,130,246,0.25)' : 'transparent',
            color: alwaysOnTop ? 'var(--accent-blue)' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ⊞
        </button>

        {/* Minimize to tray */}
        <button
          title="Minimize"
          onClick={() => win.minimize()}
          className="w-5 h-5 rounded flex items-center justify-center text-xs transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-muted)', border: 'none', cursor: 'pointer', background: 'transparent' }}
        >
          —
        </button>

        {/* Hide (not close — the tray keeps the app running) */}
        <button
          title="Hide to tray"
          onClick={() => win.hide()}
          className="w-5 h-5 rounded flex items-center justify-center text-xs transition-colors hover:bg-red-500/20"
          style={{ color: 'var(--text-muted)', border: 'none', cursor: 'pointer', background: 'transparent' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
