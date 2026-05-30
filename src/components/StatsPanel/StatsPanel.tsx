// Stats panel — the main view showing all live hardware sensor rows.
// Reads from the stats store and renders one StatRow per visible metric.

import { useStatsStore } from '../../store/statsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { StatRow } from './StatRow';
import { TempRing } from './TempRing';

/** Format bytes to a human-readable string (KB, MB, GB) */
function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/** Format a byte/s rate to a tidy bandwidth string */
function fmtRate(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 ** 2) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${(bytesPerSec / 1024 ** 2).toFixed(1)} MB/s`;
}

export function StatsPanel() {
  const { current, cpuHistory, ramHistory } = useStatsStore();
  const { visibleSections } = useSettingsStore();

  // Show a loading message during the Rust warm-up period (< 1 second)
  if (!current) {
    return (
      <div
        className="flex items-center justify-center py-8 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Collecting data…
      </div>
    );
  }

  const { cpu, memory, gpu, disks, network } = current;

  return (
    <div className="overflow-y-auto flex-1">

      {/* ── CPU ─────────────────────────────────────────────────── */}
      {visibleSections.cpu && (
        <section>
          <StatRow
            label="CPU"
            value={cpu.usage_total}
            displayValue={`${cpu.usage_total.toFixed(1)}%`}
            history={cpuHistory}
            subtitle={`${(cpu.frequency_mhz / 1000).toFixed(2)} GHz`}
            color="var(--accent-blue)"
            rightSlot={<TempRing tempC={cpu.temperature_c} size={28} />}
          />

          {/* Per-core bars — shown as a compact grid */}
          {cpu.usage_per_core.length > 1 && (
            <div className="px-3 pb-1 grid gap-0.5" style={{
              gridTemplateColumns: `repeat(${Math.min(cpu.usage_per_core.length, 8)}, 1fr)`
            }}>
              {cpu.usage_per_core.map((usage, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: '2px',
                      background: `linear-gradient(to right, var(--accent-blue) ${usage}%, var(--bar-track) ${usage}%)`,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '2px 12px' }} />

      {/* ── Memory ──────────────────────────────────────────────── */}
      {visibleSections.memory && (
        <StatRow
          label="RAM"
          value={memory.used_percent}
          displayValue={`${fmtBytes(memory.used_bytes)} / ${fmtBytes(memory.total_bytes)}`}
          history={ramHistory}
          color="var(--accent-purple)"
        />
      )}

      {/* ── GPU ─────────────────────────────────────────────────── */}
      {visibleSections.gpu && gpu && (
        <>
          <div style={{ height: '1px', background: 'var(--border)', margin: '2px 12px' }} />
          <StatRow
            label="GPU"
            value={gpu.usage_percent}
            displayValue={`${gpu.usage_percent}%`}
            subtitle={gpu.name.split(' ').slice(-2).join(' ')}
            color="var(--accent-green)"
            rightSlot={<TempRing tempC={gpu.temperature_c} size={28} />}
          />
          <StatRow
            label="VRAM"
            value={(gpu.vram_used_bytes / gpu.vram_total_bytes) * 100}
            displayValue={`${fmtBytes(gpu.vram_used_bytes)} / ${fmtBytes(gpu.vram_total_bytes)}`}
            color="var(--accent-green)"
          />
          {gpu.power_watts !== null && (
            <div
              className="px-3 pb-1 text-[10px] text-right"
              style={{ color: 'var(--text-muted)' }}
            >
              {gpu.power_watts.toFixed(0)} W
            </div>
          )}
        </>
      )}

      {/* ── Disks ───────────────────────────────────────────────── */}
      {visibleSections.disk && disks.length > 0 && (
        <>
          <div style={{ height: '1px', background: 'var(--border)', margin: '2px 12px' }} />
          {disks.map((disk) => (
            <div key={disk.mount_point}>
              <StatRow
                label={`DISK ${disk.mount_point}`}
                value={(disk.used_bytes / disk.total_bytes) * 100}
                displayValue={`${fmtBytes(disk.used_bytes)} / ${fmtBytes(disk.total_bytes)}`}
                color="var(--accent-orange)"
              />
              {/* I/O rate row */}
              <div
                className="px-3 pb-1 text-[9px] tabular-nums flex gap-3 justify-end"
                style={{ color: 'var(--text-muted)' }}
              >
                <span>R {fmtRate(disk.read_bytes_per_sec)}</span>
                <span>W {fmtRate(disk.write_bytes_per_sec)}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Network ─────────────────────────────────────────────── */}
      {visibleSections.network && (
        <>
          <div style={{ height: '1px', background: 'var(--border)', margin: '2px 12px' }} />
          <StatRow
            label={`NET ↓`}
            value={Math.min(100, (network.download_bytes_per_sec / (125_000_000)) * 100)} // Normalise to ~1 Gbps
            displayValue={fmtRate(network.download_bytes_per_sec)}
            color="var(--accent-blue)"
            subtitle={network.interface_name}
          />
          <StatRow
            label="NET ↑"
            value={Math.min(100, (network.upload_bytes_per_sec / (125_000_000)) * 100)}
            displayValue={fmtRate(network.upload_bytes_per_sec)}
            color="var(--accent-purple)"
          />
        </>
      )}

      {/* Bottom padding */}
      <div className="h-2" />
    </div>
  );
}
