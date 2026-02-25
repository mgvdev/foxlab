import { Store } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, type PollIntervalMinutes, type Settings, type ThemeMode } from "./types";

const STORE_PATH = "foxlab-settings.json";

const SETTINGS_BASE_URL_KEY = "settings.gitlabBaseUrl";
const SETTINGS_TOKEN_KEY = "settings.personalAccessToken";
const SETTINGS_POLL_INTERVAL_KEY = "settings.pollIntervalMinutes";
const SETTINGS_THEME_KEY = "settings.theme";
const SETTINGS_MUTED_MR_IIDS_KEY = "settings.mutedMrIids";
const SETTINGS_SHOW_COMMENT_AVATARS_KEY = "settings.showCommentAvatars";
const SETTINGS_CYCLE_START_LABEL_KEY = "settings.cycleStartLabel";
const SETTINGS_CYCLE_END_LABEL_KEY = "settings.cycleEndLabel";

const LAST_SEEN_COMMENT_AT_KEY = "state.lastSeenCommentAt";
const LAST_NOTIFIED_COMMENT_AT_KEY = "state.lastNotifiedCommentAt";

let storePromise: Promise<Store> | null = null;

async function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = Store.load(STORE_PATH);
  }

  return storePromise;
}

function isPollInterval(value: unknown): value is PollIntervalMinutes {
  return value === 1 || value === 2 || value === 3 || value === 5;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function parseMutedMrIids(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export async function loadSettings(): Promise<Settings> {
  const store = await getStore();

  const [baseUrl, token, pollInterval, theme, mutedMrIids, showCommentAvatars, cycleStartLabel, cycleEndLabel] = await Promise.all([
    store.get<string>(SETTINGS_BASE_URL_KEY),
    store.get<string>(SETTINGS_TOKEN_KEY),
    store.get<number>(SETTINGS_POLL_INTERVAL_KEY),
    store.get<string>(SETTINGS_THEME_KEY),
    store.get<unknown>(SETTINGS_MUTED_MR_IIDS_KEY),
    store.get<boolean>(SETTINGS_SHOW_COMMENT_AVATARS_KEY),
    store.get<string>(SETTINGS_CYCLE_START_LABEL_KEY),
    store.get<string>(SETTINGS_CYCLE_END_LABEL_KEY),
  ]);

  return {
    gitlabBaseUrl: baseUrl ?? DEFAULT_SETTINGS.gitlabBaseUrl,
    personalAccessToken: token ?? DEFAULT_SETTINGS.personalAccessToken,
    pollIntervalMinutes: isPollInterval(pollInterval)
      ? pollInterval
      : DEFAULT_SETTINGS.pollIntervalMinutes,
    theme: isThemeMode(theme) ? theme : DEFAULT_SETTINGS.theme,
    mutedMrIids: parseMutedMrIids(mutedMrIids),
    showCommentAvatars:
      typeof showCommentAvatars === "boolean"
        ? showCommentAvatars
        : DEFAULT_SETTINGS.showCommentAvatars,
    cycleStartLabel:
      typeof cycleStartLabel === "string" ? cycleStartLabel : DEFAULT_SETTINGS.cycleStartLabel,
    cycleEndLabel:
      typeof cycleEndLabel === "string" ? cycleEndLabel : DEFAULT_SETTINGS.cycleEndLabel,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const store = await getStore();

  await Promise.all([
    store.set(SETTINGS_BASE_URL_KEY, settings.gitlabBaseUrl),
    store.set(SETTINGS_TOKEN_KEY, settings.personalAccessToken),
    store.set(SETTINGS_POLL_INTERVAL_KEY, settings.pollIntervalMinutes),
    store.set(SETTINGS_THEME_KEY, settings.theme),
    store.set(SETTINGS_MUTED_MR_IIDS_KEY, settings.mutedMrIids),
    store.set(SETTINGS_SHOW_COMMENT_AVATARS_KEY, settings.showCommentAvatars),
    store.set(SETTINGS_CYCLE_START_LABEL_KEY, settings.cycleStartLabel),
    store.set(SETTINGS_CYCLE_END_LABEL_KEY, settings.cycleEndLabel),
  ]);

  await store.save();
}

export async function loadLastSeenCommentAt(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>(LAST_SEEN_COMMENT_AT_KEY)) ?? null;
}

export async function saveLastSeenCommentAt(value: string): Promise<void> {
  const store = await getStore();
  await store.set(LAST_SEEN_COMMENT_AT_KEY, value);
  await store.save();
}

export async function loadLastNotifiedCommentAt(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>(LAST_NOTIFIED_COMMENT_AT_KEY)) ?? null;
}

export async function saveLastNotifiedCommentAt(value: string): Promise<void> {
  const store = await getStore();
  await store.set(LAST_NOTIFIED_COMMENT_AT_KEY, value);
  await store.save();
}
