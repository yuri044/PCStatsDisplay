// Custom monoline icon set — 16x16 grid, 1.4px stroke, currentColor.
// Replaces emoji glyphs in the titlebar with an original, minimal mark set
// (inspired by monochrome/dot-matrix minimalism, not traced from any source).

interface IconProps {
  size?: number;
  className?: string;
}

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** App mark: a screen with a pulse line — "PC" + "stats monitor" in one glyph */
export function AppMarkIcon({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} {...base}>
      <rect x="1.5" y="3" width="13" height="9" rx="1.5" />
      <path d="M4 7.5 L5.7 7.5 L7 5 L9 10.5 L10.3 7.5 L12 7.5" />
    </svg>
  );
}

/** Log file / document with text lines */
export function LogsIcon({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} {...base}>
      <rect x="3" y="1.5" width="10" height="13" rx="1.5" />
      <path d="M5.5 5 H10.5 M5.5 8 H10.5 M5.5 11 H8.5" />
    </svg>
  );
}

/** Thumbtack — always-on-top toggle */
export function PinIcon({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} {...base}>
      <circle cx="8" cy="5.5" r="3" />
      <path d="M8 8.5 V14" />
    </svg>
  );
}

/** Window minimize */
export function MinimizeIcon({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} {...base}>
      <path d="M3 11.5 H13" />
    </svg>
  );
}

/** Window maximize */
export function MaximizeIcon({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} {...base}>
      <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
    </svg>
  );
}

/** Window restore (overlapping squares) */
export function RestoreIcon({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} {...base}>
      <rect x="3" y="5" width="8" height="8" rx="1" />
      <rect x="5.5" y="2.5" width="8" height="8" rx="1" />
    </svg>
  );
}

/** Close / hide to tray */
export function CloseIcon({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} {...base}>
      <path d="M4 4 L12 12 M12 4 L4 12" />
    </svg>
  );
}
