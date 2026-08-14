import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface CommandResult {
  stdout: string;
  stderr: string;
  success: bool;
  code: number | null;
}

interface LogEntry {
  command: string;
  output: string;
  isError: boolean;
}

interface CmdTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CmdTerminal({ isOpen, onClose }: CmdTerminalProps) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-scroll to bottom on new history
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '`') {
      e.preventDefault();
      onClose();
      return;
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

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
    <motion.div
      initial={{ y: '-100%', opacity: 0 }}
      animate={{ 
        y: isOpen ? 0 : '-100%', 
        opacity: isOpen ? 1 : 0 
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute top-0 left-0 right-0 z-50 flex flex-col bg-black/90 backdrop-blur-md border-b border-white/10 shadow-2xl h-[50vh] max-h-[500px]"
    >
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm selection:bg-white/20"
      >
        {history.length === 0 ? (
          <div className="text-white/40 italic">Terminal ready. Type a command...</div>
        ) : (
          history.map((entry, idx) => (
            <div key={idx} className="break-words">
              <div className="text-emerald-400 font-bold tracking-tight shrink-0 flex gap-2">
                <span className="text-emerald-500/50">❯</span>
                {entry.command}
              </div>
              <div className={`mt-1 whitespace-pre-wrap ${entry.isError ? 'text-rose-400' : 'text-gray-300'}`}>
                {entry.output}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="h-12 border-t border-white/10 flex items-center px-4 bg-black/40 shrink-0">
        <span className="text-emerald-500 mr-3 font-mono font-bold">❯</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder={isRunning ? "Executing..." : "Enter command..."}
          className="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder:text-white/20 disabled:opacity-50"
        />
      </div>
    </motion.div>
  );
}
