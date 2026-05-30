// Tauri application entry point.
// The `windows_subsystem = "windows"` attribute suppresses the console window
// in release builds on Windows (without it you'd see a black cmd window on launch).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    pc_monitor_lib::run()
}
