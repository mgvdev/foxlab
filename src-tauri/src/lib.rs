use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, PhysicalPosition, Position, WindowEvent};

fn position_main_window_near_tray(
    window: &tauri::WebviewWindow,
    position: PhysicalPosition<f64>,
) {
    let fallback_width = 540i32;
    let width = window
        .outer_size()
        .map(|size| size.width as i32)
        .unwrap_or(fallback_width);

    let x = position.x as i32 - (width / 2);
    let y = position.y as i32 + 10;
    let _ = window.set_position(Position::Physical(PhysicalPosition::new(x, y)));
}

fn toggle_main_window(app: &tauri::AppHandle, position: Option<PhysicalPosition<f64>>) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.emit("main-window:request-exit", ());
            return;
        }

        if let Some(click_position) = position {
            position_main_window_near_tray(&window, click_position);
        }

        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("main-window:enter", ());
    }
}

#[tauri::command]
fn hide_main_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    window.hide().map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![hide_main_window])
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            let icon = app.default_window_icon().cloned().expect("missing app icon");
            let tray_quit_item = MenuItem::with_id(app, "tray_quit", "Quitter", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&tray_quit_item])?;

            TrayIconBuilder::new()
                .icon(icon)
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        position,
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(&tray.app_handle(), Some(position));
                    }
                })
                .on_menu_event(|app, event| {
                    if event.id().as_ref() == "tray_quit" {
                        app.exit(0);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            if let WindowEvent::Focused(false) = event {
                let _ = window.emit("main-window:request-exit", ());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
