// Background stats collector.
//
// Runs a dedicated OS thread that:
//   1. Refreshes sysinfo every 500ms
//   2. Assembles a SystemStats snapshot
//   3. Emits it to the WebView via the "stats-update" Tauri event
//
// IMPORTANT — warm-up:
//   sysinfo computes CPU usage as a delta between two consecutive readings.
//   The very first reading always shows 0% because there is no previous sample.
//   We skip the first two cycles before emitting to ensure the frontend
//   receives accurate values immediately.

use std::{
    sync::{Arc, Mutex},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use sysinfo::{Disks, Networks, System};
use tauri::{AppHandle, Emitter};

use super::{cpu, disk, gpu, memory, network, types::SystemStats};

/// How often the collector wakes up (milliseconds)
const POLL_MS: u64 = 500;

/// How many cycles to run silently before emitting to let CPU deltas stabilize
const WARM_UP_CYCLES: u32 = 2;

/// How many poll ticks to wait between hardware-temperature reads.
/// On Windows, reading temperature means a full COM/WMI round trip every call
/// (see cpu::read_temperature docs), and temperature changes slowly enough
/// that 500ms resolution buys nothing — so it's only sampled every 4th tick (~2s).
const TEMP_POLL_EVERY_N_TICKS: u32 = 4;

pub struct StatsCollector {
    sys: Arc<Mutex<System>>,
    networks: Arc<Mutex<Networks>>,
    disks: Arc<Mutex<Disks>>,
}

impl StatsCollector {
    pub fn new() -> Self {
        // Initialize everything upfront so the first real refresh is fast
        Self {
            sys: Arc::new(Mutex::new(System::new_all())),
            networks: Arc::new(Mutex::new(Networks::new_with_refreshed_list())),
            disks: Arc::new(Mutex::new(Disks::new_with_refreshed_list())),
        }
    }

    /// Spawn the background polling thread.
    /// Takes ownership of `self` so the Arc clones live for the thread's lifetime.
    pub fn start(self, app: AppHandle) {
        let sys = Arc::clone(&self.sys);
        let networks = Arc::clone(&self.networks);
        let disks = Arc::clone(&self.disks);

        thread::spawn(move || {
            tracing::info!(
                poll_ms = POLL_MS,
                warm_up_cycles = WARM_UP_CYCLES,
                "Collector thread spawned"
            );
            let mut warm_up = 0u32;
            let mut tick = 0u32;
            let mut cached_temp_c: Option<f32> = None;

            loop {
                // ── 1. Refresh system state ───────────────────────────────
                {
                    let mut s = sys.lock().expect("stats sys lock poisoned");
                    // Use targeted refreshes to stay well under 1% CPU overhead
                    s.refresh_cpu_usage(); // per-core usage + frequency
                    s.refresh_memory(); // RAM + swap
                    // Process-table refresh is only needed as a disk-I/O fallback
                    // on non-Windows platforms — Windows reads aggregate
                    // throughput straight from a WMI perf counter instead (see
                    // disk.rs), so walking every process here would be pure
                    // overhead on the platform most users run this on.
                    #[cfg(not(windows))]
                    s.refresh_processes();
                }
                {
                    let mut n = networks.lock().expect("stats networks lock poisoned");
                    n.refresh(); // receive/transmit byte deltas
                }
                {
                    let mut d = disks.lock().expect("stats disks lock poisoned");
                    d.refresh(); // mount point space info
                }

                // ── 2. Skip first N cycles while deltas stabilize ─────────
                if warm_up < WARM_UP_CYCLES {
                    warm_up += 1;
                    tracing::debug!(cycle = warm_up, of = WARM_UP_CYCLES, "Warm-up cycle");
                    if warm_up == WARM_UP_CYCLES {
                        tracing::info!("Warm-up complete — emitting stats");
                    }
                    thread::sleep(Duration::from_millis(POLL_MS));
                    continue;
                }

                // ── 3. Sample hardware temperature on a slower cadence ────
                if tick % TEMP_POLL_EVERY_N_TICKS == 0 {
                    cached_temp_c = cpu::read_temperature();
                }
                tick = tick.wrapping_add(1);

                // ── 4. Build snapshot ─────────────────────────────────────
                let stats = {
                    let s = sys.lock().expect("stats sys lock poisoned");
                    let n = networks.lock().expect("stats networks lock poisoned");
                    let d = disks.lock().expect("stats disks lock poisoned");

                    SystemStats {
                        cpu: cpu::collect(&s, cached_temp_c),
                        memory: memory::collect(&s),
                        gpu: gpu::collect(),
                        disks: disk::collect(&d, &s),
                        network: network::collect(&n),
                        timestamp: SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as u64,
                    }
                };

                // ── 5. Push to WebView ────────────────────────────────────
                // TRACE is filtered out unless RUST_LOG=trace — at 2 ticks/sec
                // it would exhaust the 15 MB log rotation budget within hours
                tracing::trace!(timestamp = stats.timestamp, "Stats emitted");
                if let Err(e) = app.emit("stats-update", stats) {
                    tracing::warn!(error = %e, "Emit to WebView failed");
                }

                thread::sleep(Duration::from_millis(POLL_MS));
            }
        });
    }
}
