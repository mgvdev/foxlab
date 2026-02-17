use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, PhysicalPosition, Position, WindowEvent};

fn position_main_window_near_tray(
    window: &tauri::WebviewWindow,
    position: PhysicalPosition<f64>,
) {
    let fallback_width = 420i32;
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
            let _ = window.hide();
            return;
        }

        if let Some(click_position) = position {
            position_main_window_near_tray(&window, click_position);
        }

        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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

            TrayIconBuilder::new()
                .icon(icon)
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
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            if let WindowEvent::Focused(false) = event {
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
