import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

import { useStatsStore } from '../../store/statsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { fmtBytes } from '../StatsPanel/StatsPanel';
import type { SystemInfo } from '../../types/systemInfo';
import type { ProcessInfo } from '../../types/process';
// Cropped app icon (text/glyph clutter removed, girl only)
import appIcon from '../../assets/app-icon.png';

interface CommandResult {
  stdout: string;
  stderr: string;
  success: boolean;
  code: number | null;
}

interface LogEntry {
  command: string;
  output: string;
  isError: boolean;
}

/** "4 hours, 32 mins" style uptime, matching neofetch's format */
function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days} day${days === 1 ? '' : 's'}, ${hours} hour${hours === 1 ? '' : 's'}`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}, ${mins} min${mins === 1 ? '' : 's'}`;
  return `${mins} min${mins === 1 ? '' : 's'}`;
}

const ACCENT_TOKENS = [
  '--accent-blue',
  '--accent-green',
  '--accent-orange',
  '--accent-red',
  '--accent-purple',
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5 whitespace-nowrap">
      <span className="font-bold shrink-0" style={{ color: 'var(--accent-blue)' }}>{label}:</span>
      <span className="truncate" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function SystemBanner() {
  const { current } = useStatsStore();
  const { theme } = useSettingsStore();
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [processCount, setProcessCount] = useState<number | null>(null);

  useEffect(() => {
    invoke<SystemInfo>('get_system_info').then(setSysInfo).catch(console.error);
    invoke<ProcessInfo[]>('get_process_list')
      .then((list) => setProcessCount(list.length))
      .catch(console.error);
  }, []);

  if (!sysInfo) {
    return (
      <div className="p-4 text-xs italic" style={{ color: 'var(--text-muted)' }}>
        Loading system info...
      </div>
    );
  }

  const resolution = `${window.screen.width}x${window.screen.height}`;
  const cpuLine = `${sysInfo.cpu_model} (${sysInfo.cpu_cores}) @ ${(sysInfo.cpu_max_freq_mhz / 1000).toFixed(2)}GHz`;
  const memoryLine = current
    ? `${fmtBytes(current.memory.used_bytes)} / ${fmtBytes(current.memory.total_bytes)}`
    : '...';
  const gpuLine = current?.gpu?.name ?? 'N/A';

  return (
    <div className="@container border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-col items-center gap-3 p-4 @[500px]:flex-row @[500px]:items-start @[500px]:gap-5">
        <img
          src={appIcon}
          alt=""
          className="w-20 h-20 shrink-0 rounded-lg object-cover"
          style={{ border: '1px solid var(--border)' }}
        />

        <div className="flex-1 min-w-0 font-mono text-[11px] leading-5">
          <div className="font-bold" style={{ color: 'var(--accent-green)' }}>
            {sysInfo.username}@{sysInfo.host_name}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>-------------------</div>

          <InfoRow label="OS" value={sysInfo.os_name} />
          <InfoRow label="Host" value={sysInfo.host_name} />
          <InfoRow label="Uptime" value={formatUptime(sysInfo.uptime_seconds)} />
          <InfoRow label="Processes" value={processCount !== null ? String(processCount) : '...'} />
          <InfoRow label="Shell" value="PowerShell" />
          <InfoRow label="Resolution" value={resolution} />
          <InfoRow label="Theme" value={`${theme === 'dark' ? 'Dark' : 'Light'} [PC Monitor]`} />
          <InfoRow label="CPU" value={cpuLine} />
          <InfoRow label="GPU" value={gpuLine} />
          <InfoRow label="Memory" value={memoryLine} />

          <div className="flex gap-1 mt-2">
            {ACCENT_TOKENS.map((token) => (
              <div key={token} className="w-4 h-3 rounded-sm" style={{ background: `var(${token})` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CmdTerminal() {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when the tab mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll to bottom on new history
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setCommand(commandHistory[commandHistory.length - 1 - nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommand(commandHistory[commandHistory.length - 1 - nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const executeCommand = async () => {
    if (!command.trim() || isRunning) return;

    const cmdToRun = command.trim();
    setCommandHistory(prev => [...prev, cmdToRun]);
    setHistoryIndex(-1);
    setCommand('');
    setIsRunning(true);
    
    setHistory(prev => [...prev, { command: cmdToRun, output: 'Running...', isError: false }]);

    try {
      const result = await invoke<CommandResult>('execute_shell_command', { command: cmdToRun });
      const output = result.stdout || result.stderr || (result.success ? 'Command completed successfully.' : `Command failed with code ${result.code}`);
      
      setHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = {
          command: cmdToRun,
          output,
          isError: !result.success,
        };
        return newHistory;
      });
    } catch (err) {
      setHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = {
          command: cmdToRun,
          output: String(err),
          isError: true,
        };
        return newHistory;
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-sm"
      >
        <SystemBanner />

        <div className="p-4 space-y-2">
          {history.map((entry, idx) => (
            <div key={idx} className="break-words">
              <div
                className="font-bold tracking-tight shrink-0 flex gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <span style={{ color: 'var(--accent-green)' }}>❯</span>
                {entry.command}
              </div>
              <div
                className="mt-1 whitespace-pre-wrap"
                style={{ color: entry.isError ? 'var(--accent-red)' : 'var(--text-primary)' }}
              >
                {entry.output}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="h-12 flex items-center px-4 shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <span
          className="mr-3 font-mono font-bold"
          style={{ color: 'var(--accent-green)' }}
        >
          ❯
        </span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder={isRunning ? "Executing..." : "Enter command..."}
          className="flex-1 bg-transparent border-none outline-none font-mono disabled:opacity-50"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>
    </div>
  );
}
