// Logging initialisation.
//
// Writes structured log lines to a size-rotated file:
//   %APPDATA%\com.pcmonitor.app\logs\app.log   (5 MB per file, 3 files kept)
//
// Level policy: INFO and above by default. Override with the RUST_LOG env var
// (e.g. RUST_LOG=trace) for a one-off deep-debugging session — the 500ms
// collector tick logs at TRACE and would otherwise churn through the entire
// 15 MB rotation budget in under a day.
//
// Panic safety: the release profile sets `panic = "abort"`, so a panic kills
// the process with no unwinding — the non-blocking writer's background flush
// thread may never run again. The panic hook below therefore writes its line
// synchronously with a fresh blocking file handle.

use std::{fs, io::Write, path::PathBuf};

use rolling_file::{BasicRollingFileAppender, RollingConditionBasic};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Rotate once a file reaches this size.
const MAX_FILE_BYTES: u64 = 5 * 1024 * 1024;

/// How many rotated files to keep (app.log + app.log.1 + app.log.2).
const MAX_FILES: usize = 3;

/// Initialise the global tracing subscriber and the panic hook.
/// The returned WorkerGuard must be kept alive for the app's lifetime —
/// dropping it stops the background flush thread and loses buffered lines.
pub fn init(log_dir: PathBuf) -> Result<WorkerGuard, Box<dyn std::error::Error>> {
    fs::create_dir_all(&log_dir)?;
    let log_path = log_dir.join("app.log");

    let appender = BasicRollingFileAppender::new(
        &log_path,
        RollingConditionBasic::new().max_size(MAX_FILE_BYTES),
        MAX_FILES,
    )?;
    let (non_blocking, guard) = tracing_appender::non_blocking(appender);

    // INFO by default; RUST_LOG overrides (e.g. RUST_LOG=trace)
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    // Mirror to stderr in dev builds so `npm run tauri dev` shows logs live
    let stderr_layer =
        cfg!(debug_assertions).then(|| fmt::layer().with_writer(std::io::stderr));

    tracing_subscriber::registry()
        .with(filter)
        .with(fmt::layer().with_writer(non_blocking).with_ansi(false))
        .with(stderr_layer)
        .init();

    install_panic_hook(log_path.clone());

    tracing::info!(log_path = %log_path.display(), "Logger initialised");
    Ok(guard)
}

/// Write panic details straight to the log file with a blocking handle,
/// bypassing the non-blocking layer, so the line hits disk before abort.
fn install_panic_hook(log_path: PathBuf) {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        if let Ok(mut file) = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
        {
            let ts = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ");
            let _ = writeln!(
                file,
                "{ts} ERROR pc_monitor: PANIC — process will abort panic=\"{info}\""
            );
            let _ = file.flush();
        }
        // Still print to stderr like the default hook would
        previous(info);
    }));
}
