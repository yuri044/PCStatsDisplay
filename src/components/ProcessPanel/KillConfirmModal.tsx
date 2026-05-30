// Kill-process confirmation dialog.
//
// Two-step kill flow:
//   1. User clicks kill button on a ProcessRow → this modal appears
//   2. User confirms → invoke kill_process
//      a. Success → toast "✓ Terminated", remove from list
//      b. Needs elevation → show "Retry as Administrator" button
//         → invoke kill_process_elevated (triggers UAC prompt)

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useProcessStore } from '../../store/processStore';
import { useToast } from '../shared/Toast';
import type { ProcessInfo } from '../../types/process';

interface Props {
  /** Process to confirm killing; null = modal closed */
  process: ProcessInfo | null;
  onClose: () => void;
}

export function KillConfirmModal({ process, onClose }: Props) {
  const { killProcess, killProcessElevated } = useProcessStore();
  const { showToast } = useToast();
  const [isKilling, setIsKilling] = useState(false);
  const [needsElevation, setNeedsElevation] = useState(false);

  const handleKill = async () => {
    if (!process) return;
    setIsKilling(true);

    try {
      const { requiresElevation, message } = await killProcess(process.pid);

      if (requiresElevation) {
        // Don't close the modal — show the "retry as admin" option instead
        setNeedsElevation(true);
        showToast(message, 'warning');
      } else {
        showToast(`✓ ${process.name} terminated`, 'success');
        onClose();
      }
    } catch {
      showToast('Kill failed — unknown error', 'error');
      onClose();
    } finally {
      setIsKilling(false);
    }
  };

  const handleKillElevated = async () => {
    if (!process) return;
    setIsKilling(true);

    try {
      await killProcessElevated(process.pid);
      showToast(`✓ ${process.name} terminated (admin)`, 'success');
      onClose();
    } catch {
      showToast('Could not terminate — process may be SYSTEM-protected', 'error');
      onClose();
    } finally {
      setIsKilling(false);
    }
  };

  // Reset elevation state when modal closes
  const handleClose = () => {
    setNeedsElevation(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {process && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={handleClose}
          />

          {/* Dialog card */}
          <motion.div
            className="fixed inset-x-3 z-50 rounded-xl p-4 flex flex-col gap-3"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
            initial={{ scale: 0.9, opacity: 0, y: '-40%' }}
            animate={{ scale: 1, opacity: 1, y: '-50%' }}
            exit={{ scale: 0.9, opacity: 0, y: '-40%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Title */}
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {needsElevation ? 'Administrator Required' : 'End Process?'}
            </p>

            {/* Body */}
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {needsElevation ? (
                <>
                  <strong style={{ color: 'var(--text-primary)' }}>{process.name}</strong> requires
                  administrator rights to terminate. Windows will show a UAC prompt.
                </>
              ) : (
                <>
                  <strong style={{ color: 'var(--text-primary)' }}>{process.name}</strong>{' '}
                  (PID {process.pid}) will be terminated. Any unsaved work will be lost.
                </>
              )}
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleClose}
                disabled={isKilling}
                className="px-3 py-1.5 rounded text-xs"
                style={{
                  background: 'var(--bg-hover)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              {needsElevation ? (
                <button
                  onClick={handleKillElevated}
                  disabled={isKilling}
                  className="px-3 py-1.5 rounded text-xs font-semibold"
                  style={{
                    background: 'rgba(249,115,22,0.2)',
                    color: 'var(--accent-orange)',
                    border: '1px solid rgba(249,115,22,0.3)',
                    cursor: isKilling ? 'wait' : 'pointer',
                  }}
                >
                  {isKilling ? 'Waiting for UAC…' : 'Retry as Administrator'}
                </button>
              ) : (
                <button
                  onClick={handleKill}
                  disabled={isKilling}
                  className="px-3 py-1.5 rounded text-xs font-semibold"
                  style={{
                    background: 'rgba(239,68,68,0.2)',
                    color: 'var(--danger)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    cursor: isKilling ? 'wait' : 'pointer',
                  }}
                >
                  {isKilling ? 'Terminating…' : 'End Process'}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
