// Lightweight toast notification system.
//
// Usage:
//   const { showToast } = useToast();
//   showToast('Process terminated', 'success');
//
// Toasts stack at the bottom of the window and auto-dismiss after 3 seconds.

import { AnimatePresence, motion } from 'framer-motion';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  /** Optional action button label */
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (
    message: string,
    type?: ToastType,
    actionLabel?: string,
    onAction?: () => void
  ) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

let nextId = 0;

/** Wrap your app with this provider to enable toasts everywhere. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      actionLabel?: string,
      onAction?: () => void
    ) => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, type, actionLabel, onAction }]);

      // Auto-dismiss after 3 s (extend to 5 s if there's an action)
      setTimeout(
        () => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        },
        actionLabel ? 5000 : 3000
      );
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast portal — rendered at the bottom of the overlay */}
      <div
        className="fixed bottom-3 left-0 right-0 flex flex-col items-center gap-1.5 px-3 z-50 pointer-events-none"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full rounded-lg px-3 py-2 text-xs flex items-center gap-2 pointer-events-auto"
              style={{
                background: toastBg(toast.type),
                color: 'var(--text-primary)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
            >
              {/* Icon */}
              <span>{toastIcon(toast.type)}</span>
              {/* Message */}
              <span className="flex-1">{toast.message}</span>
              {/* Optional action button */}
              {toast.actionLabel && toast.onAction && (
                <button
                  onClick={toast.onAction}
                  className="text-xs font-semibold underline opacity-80 hover:opacity-100"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                >
                  {toast.actionLabel}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function toastBg(type: ToastType): string {
  switch (type) {
    case 'success': return 'rgba(34,197,94,0.2)';
    case 'error':   return 'rgba(239,68,68,0.2)';
    case 'warning': return 'rgba(249,115,22,0.2)';
    default:        return 'rgba(59,130,246,0.2)';
  }
}

function toastIcon(type: ToastType): string {
  switch (type) {
    case 'success': return '✓';
    case 'error':   return '✕';
    case 'warning': return '⚠';
    default:        return 'ℹ';
  }
}
