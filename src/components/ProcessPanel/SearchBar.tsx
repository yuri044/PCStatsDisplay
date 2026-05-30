// Live process filter input.
// Debouncing is intentionally omitted — with 200+ processes the filter
// runs in JavaScript entirely and is fast enough to update on every keystroke.

interface Props {
  value: string;
  onChange: (query: string) => void;
  count: number;
  totalCount: number;
}

export function SearchBar({ value, onChange, count, totalCount }: Props) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Search icon */}
      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>⌕</span>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter processes…"
        spellCheck={false}
        className="flex-1 text-xs bg-transparent outline-none"
        style={{
          color: 'var(--text-primary)',
          caretColor: 'var(--accent-blue)',
          border: 'none',
        }}
      />

      {/* Show how many processes match out of total */}
      <span
        className="text-[9px] tabular-nums shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        {count}/{totalCount}
      </span>

      {/* Clear button — only shown when there's a query */}
      {value && (
        <button
          onClick={() => onChange('')}
          title="Clear filter"
          className="text-[10px] leading-none"
          style={{
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
