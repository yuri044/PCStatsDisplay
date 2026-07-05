// Tauri commands exposing the log file to the frontend.
//
// open_log_file — opens the logs directory in File Explorer (titlebar 📋
//                 button and the Logs tab's folder button)
// read_log_tail — returns the last N lines of app.log for the in-app viewer

use tauri::{command, AppHandle, Manager};

/// Hard cap on lines returned to the WebView regardless of what's requested —
/// keeps the IPC payload bounded even against a 5 MB log file.
const MAX_TAIL_LINES: usize = 1000;

#[command]
pub fn open_log_file(app: AppHandle) -> Result<(), String> {
    let log_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("logs");

    tracing::info!(log_dir = %log_dir.display(), "Opening log folder in Explorer");

    std::process::Command::new("explorer.exe")
        .arg(&log_dir)
        .spawn()
        .map_err(|e| format!("Failed to open log folder: {}", e))?;

    Ok(())
}

/// Return the last `max_lines` lines of app.log (newest last).
/// Polled by the Logs tab every couple of seconds while it is visible, so it
/// stays quiet in the log itself — logging each read would pollute what the
/// user is trying to inspect.
#[command]
pub fn read_log_tail(app: AppHandle, max_lines: Option<usize>) -> Result<Vec<String>, String> {
    let log_path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("logs")
        .join("app.log");

    if !log_path.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(&log_path)
        .map_err(|e| format!("Failed to read log file: {}", e))?;

    let limit = max_lines.unwrap_or(500).min(MAX_TAIL_LINES);
    let lines: Vec<&str> = content.lines().collect();
    let start = lines.len().saturating_sub(limit);

    Ok(lines[start..].iter().map(|s| s.to_string()).collect())
}
