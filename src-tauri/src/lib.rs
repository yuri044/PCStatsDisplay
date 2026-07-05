// Tauri application setup — module registration and builder configuration.
// All Tauri commands must be listed in the invoke_handler! macro to be callable
// from the React frontend via invoke().

mod logger;
mod logger_command;
mod process;
mod stats;
mod window;

use std::sync::Mutex;

use sysinfo::System;
use tauri::Manager;

use stats::collector::StatsCollector;
use window::tray::setup_tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Plugin: auto-start on Windows boot.
        // "--minimized" arg is passed when the app starts via autostart
        // (could be used to skip showing the window on boot if desired).
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        // Long-lived System for get_process_list — reused across polls so CPU
        // deltas are meaningful without an artificial per-call warm-up sleep.
        .manage(Mutex::new(System::new_all()))
        .setup(|app| {
            // Init logging FIRST so everything after it is captured.
            // The WorkerGuard must live as long as the app — dropping it stops
            // the background flush thread — so we hand it to Tauri's state.
            let log_dir = app.path().app_data_dir()?.join("logs");
            let guard = logger::init(log_dir)?;
            app.manage(guard);

            tracing::info!(
                version = env!("CARGO_PKG_VERSION"),
                os = %System::long_os_version().unwrap_or_default(),
                arch = std::env::consts::ARCH,
                "App started"
            );

            // Start the 500ms background polling thread
            StatsCollector::new().start(app.handle().clone());

            // Register the system tray icon + context menu
            setup_tray(app)?;

            Ok(())
        })
        // Register all commands that the React frontend can invoke()
        .invoke_handler(tauri::generate_handler![
            process::list::get_process_list,
            process::kill::kill_process,
            process::kill::kill_process_elevated,
            window::manager::set_always_on_top,
            window::manager::set_window_opacity,
            window::manager::set_autostart,
            logger_command::open_log_file,
            logger_command::read_log_tail,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
