// Window management Tauri commands.
//
// These are invoked from React to programmatically change window behaviour.
// set_window_opacity emits a frontend event rather than using a native API
// because Tauri 2 doesn't expose a direct per-window opacity setter;
// the React side applies it as a CSS variable on the root element.

use tauri::{command, AppHandle, Emitter, Manager};

/// Toggle always-on-top for the main window.
#[command]
pub fn set_always_on_top(app: AppHandle, enabled: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    window
        .set_always_on_top(enabled)
        .map_err(|e| e.to_string())
}

/// Set overall window opacity (0.5–1.0) by sending an event to the WebView.
/// The React App.tsx listens for "set-opacity" and applies it via CSS.
#[command]
pub fn set_window_opacity(app: AppHandle, opacity: f64) -> Result<(), String> {
    // Clamp to a sensible range so the window never disappears completely
    let clamped = opacity.clamp(0.1, 1.0);
    app.emit("set-opacity", clamped).map_err(|e| e.to_string())
}

/// Toggle Windows autostart using the tauri-plugin-autostart manager.
#[command]
pub fn set_autostart<R: tauri::Runtime>(app: AppHandle<R>, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|e| e.to_string())
    } else {
        manager.disable().map_err(|e| e.to_string())
    }
}
