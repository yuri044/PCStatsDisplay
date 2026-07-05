// Log viewer panel — in-app tail of %APPDATA%\com.pcmonitor.app\logs\app.log.
// Polls the Rust read_log_tail command every 2 seconds while the tab is
// active (same pattern as ProcessPanel's 3s polling), so idle cost is zero
// when the user is on another tab.

import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Refresh interval while the Logs tab is visible (milliseconds) */
const REFRESH_INTERVAL_MS = 2000;

/** How many lines to request from the backend */
const TAIL_LINES = 500;

type Level = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/** Severity order for the min-level filter */
const LEVEL_RANK: Record<Level, number> = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

/** Filter chips — "ALL" shows everything including unparseable lines */
const FILTERS = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'] as const;
type Filter = (typeof FILTERS)[number];

const LEVEL_COLOR: Record<Level, string> = {
  ERROR: 'var(--accent-red)',
  WARN: 'var(--accent-orange)',
  INFO: 'var(--text-primary)',
  DEBUG: 'var(--text-muted)',
  TRACE: 'var(--text-muted)',
};

interface ParsedLine {
  raw: string;
  time?: string; // HH:MM:SS.mmm — display-friendly slice of the timestamp
  level?: Level;
  target?: string; // last module segment, e.g. "collector"
  message?: string; //any log messages fetched from system views 
}

// Matches both tracing output and elevated-helper lines:
//   2026-07-05T21:05:01.124Z  INFO pc_monitor_lib::stats::collector: message
//   2026-07-05T21:05:14.900Z  INFO elevated-helper: message
const LINE_RE = /^(\S+T(\d{2}:\d{2}:\d{2}\.?\d*)Z?)\s+(TRACE|DEBUG|INFO|WARN|ERROR)\s+(\S+?):\s?(.*)$/;

function parseLine(raw: string): ParsedLine {
  const m = raw.match(LINE_RE);
  if (!m) return { raw };
  const target = m[4].split('::').pop() ?? m[4];
  return { raw, time: m[2], level: m[3] as Level, target, message: m[5] };
}

export function LogPanel() {
  const [lines, setLines] = useState<ParsedLine[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Whether the user is scrolled near the bottom — if so, follow new lines
  const followRef = useRef(true);

  const fetchLog = useCallback(() => {
    invoke<string[]>('read_log_tail', { maxLines: TAIL_LINES })
      .then((raw) => {
        setLines(raw.map(parseLine));
        setError(null);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setIsLoading(false));
  }, []);

  // Initial fetch + polling while the panel is mounted
  useEffect(() => {
    fetchLog();
    const timer = setInterval(fetchLog, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchLog]);

  // Track whether the user has scrolled away from the bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  // Keep pinned to the newest line unless the user scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (el && followRef.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const filtered = useMemo(() => {
    const minRank = filter === 'ALL' ? -1 : LEVEL_RANK[filter];
    const query = search.toLowerCase();
    return lines.filter((l) => {
      if (minRank >= 0 && (!l.level || LEVEL_RANK[l.level] < minRank)) return false;
      if (query && !l.raw.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [lines, filter, search]);

  const openLogFolder = () => {
    invoke('open_log_file').catch(console.error);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar: level chips + search + open folder */}
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Min-level filter chips */}
        <div className="flex items-center gap-1 shrink-0">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              title={f === 'ALL' ? 'Show all lines' : `Show ${f} and above`}
              className="px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide transition-colors"
              style={{
                background: filter === f ? 'rgba(59,130,246,0.25)' : 'transparent',
                color: filter === f ? 'var(--accent-blue)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>⌕</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter logs…"
          spellCheck={false}
          className="flex-1 min-w-0 text-xs bg-transparent outline-none"
          style={{
            color: 'var(--text-primary)',
            caretColor: 'var(--accent-blue)',
            border: 'none',
          }}
        />

        {/* Matched / total count */}
        <span
          className="text-[9px] tabular-nums shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          {filtered.length}/{lines.length}
        </span>

        {/* Open logs folder in Explorer */}
        <button
          onClick={openLogFolder}
          title="Open log folder"
          className="text-[10px] leading-none shrink-0"
          style={{
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          📂
        </button>
      </div>

      {/* Log lines */}
      {isLoading && lines.length === 0 ? (
        <div
          className="flex items-center justify-center flex-1 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          Loading logs…
        </div>
      ) : error ? (
        <div
          className="flex items-center justify-center flex-1 text-xs px-4 text-center"
          style={{ color: 'var(--accent-red)' }}
        >
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex items-center justify-center flex-1 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          {lines.length === 0 ? 'Log file is empty' : 'No lines match the filter'}
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 font-mono"
        >
          {filtered.map((l, i) => (
            <div
              key={i}
              title={l.raw}
              className="flex items-baseline gap-1.5 text-[10px] leading-4 whitespace-nowrap"
            >
              {l.level ? (
                <>
                  <span className="shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {l.time}
                  </span>
                  <span
                    className="shrink-0 w-10 font-semibold"
                    style={{ color: LEVEL_COLOR[l.level] }}
                  >
                    {l.level}
                  </span>
                  <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {l.target}
                  </span>
                  <span
                    className="truncate"
                    style={{
                      color: l.level === 'ERROR' || l.level === 'WARN'
                        ? LEVEL_COLOR[l.level]
                        : 'var(--text-primary)',
                    }}
                  >
                    {l.message}
                  </span>
                </>
              ) : (
                // Unparseable line (e.g. panic continuation) — show raw, dimmed
                <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                  {l.raw}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
