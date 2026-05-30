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
            let mut warm_up = 0u32;

            loop {
                // ── 1. Refresh system state ───────────────────────────────
                {
                    let mut s = sys.lock().expect("stats sys lock poisoned");
                    // Use targeted refreshes to stay well under 1% CPU overhead
                    s.refresh_cpu_usage(); // per-core usage + frequency
                    s.refresh_memory(); // RAM + swap
                    // Refresh processes so disk I/O deltas are current
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
                    thread::sleep(Duration::from_millis(POLL_MS));
                    continue;
                }

                // ── 3. Build snapshot ─────────────────────────────────────
                let stats = {
                    let s = sys.lock().expect("stats sys lock poisoned");
                    let n = networks.lock().expect("stats networks lock poisoned");
                    let d = disks.lock().expect("stats disks lock poisoned");

                    SystemStats {
                        cpu: cpu::collect(&s),
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

                // ── 4. Push to WebView — ignore errors (window may be hidden) ──
                let _ = app.emit("stats-update", stats);

                thread::sleep(Duration::from_millis(POLL_MS));
            }
        });
    }
}
