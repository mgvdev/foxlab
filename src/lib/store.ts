import { Store } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, type PollIntervalMinutes, type Settings } from "./types";

const STORE_PATH = "foxlab-settings.json";

const SETTINGS_BASE_URL_KEY = "settings.gitlabBaseUrl";
const SETTINGS_TOKEN_KEY = "settings.personalAccessToken";
const SETTINGS_POLL_INTERVAL_KEY = "settings.pollIntervalMinutes";

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

export async function loadSettings(): Promise<Settings> {
  const store = await getStore();

  const [baseUrl, token, pollInterval] = await Promise.all([
    store.get<string>(SETTINGS_BASE_URL_KEY),
    store.get<string>(SETTINGS_TOKEN_KEY),
    store.get<number>(SETTINGS_POLL_INTERVAL_KEY),
  ]);

  return {
    gitlabBaseUrl: baseUrl ?? DEFAULT_SETTINGS.gitlabBaseUrl,
    personalAccessToken: token ?? DEFAULT_SETTINGS.personalAccessToken,
    pollIntervalMinutes: isPollInterval(pollInterval)
      ? pollInterval
      : DEFAULT_SETTINGS.pollIntervalMinutes,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const store = await getStore();

  await Promise.all([
    store.set(SETTINGS_BASE_URL_KEY, settings.gitlabBaseUrl),
    store.set(SETTINGS_TOKEN_KEY, settings.personalAccessToken),
    store.set(SETTINGS_POLL_INTERVAL_KEY, settings.pollIntervalMinutes),
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
