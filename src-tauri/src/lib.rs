// Tauri application setup — module registration and builder configuration.
// All Tauri commands must be listed in the invoke_handler! macro to be callable
// from the React frontend via invoke().

mod process;
mod stats;
mod window;

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
        .setup(|app| {
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
