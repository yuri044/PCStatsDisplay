import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm"
      >
        {history.length === 0 ? (
          <div className="italic" style={{ color: 'var(--text-muted)' }}>
            Terminal ready. Type a command...
          </div>
        ) : (
          history.map((entry, idx) => (
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
          ))
        )}
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
