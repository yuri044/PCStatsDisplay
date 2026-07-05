// System tray setup.
//
// Creates a tray icon with a context menu:
//   Show / Hide  — toggle window visibility
//   Always on Top — toggle AOT state
//   Quit          — exit the application
//
// Double-clicking the tray icon also toggles visibility.

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};

/// Register the system tray with menu and event handlers.
/// Called once during app setup in lib.rs.
pub fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    // Build menu items
    let show = MenuItem::with_id(app, "show", "Show / Hide", true, None::<&str>)?;
    let aot = MenuItem::with_id(app, "aot", "Always on Top", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit PC Monitor", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &aot, &quit])?;

    TrayIconBuilder::new()
        // Use the default window icon as the tray icon
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("PC Monitor")
        // Context menu click handler
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => toggle_window_visibility(app, "menu"),
            "aot" => toggle_always_on_top(app),
            "quit" => {
                tracing::info!("App exiting via tray Quit");
                app.exit(0)
            }
            _ => {}
        })
        // Double-click tray icon to show/hide
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                toggle_window_visibility(tray.app_handle(), "double-click");
            }
        })
        .build(app)?;

    Ok(())
}

/// Toggle the main window between visible and hidden.
fn toggle_window_visibility(app: &tauri::AppHandle, source: &str) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            tracing::debug!(source, "Window hidden (tray)");
            let _ = window.hide();
        } else {
            tracing::debug!(source, "Window shown (tray)");
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// Toggle the always-on-top state of the main window.
fn toggle_always_on_top(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        // Flip the current state
        let current = window.is_always_on_top().unwrap_or(false);
        tracing::debug!(new_state = !current, "AOT toggled from tray");
        let _ = window.set_always_on_top(!current);
    }
}
