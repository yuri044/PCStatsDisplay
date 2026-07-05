// Tab bar for switching between the Stats, Processes, and Logs views.
// The active indicator is a sliding underline animated with Framer Motion layoutId.

import { motion } from 'framer-motion';

export type Tab = 'stats' | 'processes' | 'logs';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'stats', label: 'Stats' },
  { id: 'processes', label: 'Processes' },
  { id: 'logs', label: 'Logs' },
];

export function TabBar({ active, onChange }: Props) {
  return (
    <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="relative flex-1 py-2 text-xs font-medium tracking-wide transition-colors"
          style={{
            color: active === id ? 'var(--text-primary)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {label}

          {/* Sliding active indicator — shared layoutId makes it animate between tabs */}
          {active === id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: 'var(--accent-blue)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
