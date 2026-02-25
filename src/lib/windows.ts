import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const SETTINGS_WINDOW_LABEL = "settings";
const STATS_WINDOW_LABEL = "stats";

export interface StatsFocusTicketPayload {
  ticketId: number;
  ticketIid: number;
  projectId: number;
}

async function openOrFocusWindow(
  label: string,
  options: ConstructorParameters<typeof WebviewWindow>[1],
): Promise<WebviewWindow> {
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.show().catch(() => {});
    await existing.setFocus().catch(() => {});
    return existing;
  }

  const created = new WebviewWindow(label, options);
  await new Promise<void>((resolve, reject) => {
    created.once("tauri://created", () => resolve()).catch(reject);
    created.once("tauri://error", (event) => reject(new Error(String(event.payload)))).catch(reject);
  });

  return created;
}

export async function openSettingsWindow(): Promise<void> {
  await openOrFocusWindow(SETTINGS_WINDOW_LABEL, {
    url: "/#settings",
    title: "GitLab Companion — Settings",
    width: 520,
    height: 700,
    minWidth: 520,
    minHeight: 620,
    resizable: true,
    alwaysOnTop: false,
    decorations: true,
    focus: true,
    center: true,
  });
}

export async function openStatsWindow(payload?: StatsFocusTicketPayload): Promise<void> {
  await openOrFocusWindow(STATS_WINDOW_LABEL, {
    url: "/#stats",
    title: "GitLab Companion — Stats",
    width: 860,
    height: 700,
    minWidth: 760,
    minHeight: 560,
    resizable: true,
    alwaysOnTop: false,
    decorations: true,
    focus: true,
    center: true,
  });

  if (payload) {
    await WebviewWindow.getCurrent().emitTo(STATS_WINDOW_LABEL, "stats:focus-ticket", payload);
  }
}

