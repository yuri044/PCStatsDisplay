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
    tracing::info!(enabled, "Always-on-top toggled");
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    window.set_always_on_top(enabled).map_err(|e| {
        tracing::error!(enabled, error = %e, "Always-on-top toggle failed");
        e.to_string()
    })
}

/// Set overall window opacity (0.5–1.0) by sending an event to the WebView.
/// The React App.tsx listens for "set-opacity" and applies it via CSS.
#[command]
pub fn set_window_opacity(app: AppHandle, opacity: f64) -> Result<(), String> {
    // Clamp to a sensible range so the window never disappears completely
    let clamped = opacity.clamp(0.1, 1.0);
    tracing::debug!(requested = opacity, clamped, "Opacity changed");
    app.emit("set-opacity", clamped).map_err(|e| e.to_string())
}

/// Toggle Windows autostart using the tauri-plugin-autostart manager.
#[command]
pub fn set_autostart<R: tauri::Runtime>(app: AppHandle<R>, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    let result = if enabled {
        manager.enable()
    } else {
        manager.disable()
    };
    match &result {
        Ok(()) => tracing::info!(enabled, "Autostart toggled"),
        Err(e) => tracing::error!(enabled, error = %e, "Autostart toggle failed"),
    }
    result.map_err(|e| e.to_string())
}
