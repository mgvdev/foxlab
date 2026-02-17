import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SettingsModal } from "./components/SettingsModal";
import { TrayPopover, type ActiveTab } from "./components/TrayPopover";
import { createGitLabPoller, type PollerResult } from "./lib/poller";
import {
  loadLastNotifiedCommentAt,
  loadLastSeenCommentAt,
  loadSettings,
  saveLastNotifiedCommentAt,
  saveLastSeenCommentAt,
  saveSettings,
} from "./lib/store";
import { testGitLabConnection } from "./lib/gitlab";
import { DEFAULT_SETTINGS, type AppSnapshot, type Settings } from "./lib/types";
import "./App.css";

const EMPTY_SNAPSHOT: AppSnapshot = {
  mrs: [],
  comments: [],
  unreadCount: 0,
  lastSyncAt: null,
  error: null,
};

function hasValidSettings(settings: Settings): boolean {
  return (
    settings.gitlabBaseUrl.trim().length > 0 && settings.personalAccessToken.trim().length > 0
  );
}

function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState<Settings>(DEFAULT_SETTINGS);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(EMPTY_SNAPSHOT);
  const [activeTab, setActiveTab] = useState<ActiveTab>("comments");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState<string | null>(null);
  const [lastSeenCommentAt, setLastSeenCommentAt] = useState<string | null>(null);
  const [lastNotifiedCommentAt, setLastNotifiedCommentAt] = useState<string | null>(null);

  const pollerRef = useRef<ReturnType<typeof createGitLabPoller> | null>(null);
  const latestContextRef = useRef({
    settings,
    lastSeenCommentAt,
    lastNotifiedCommentAt,
  });

  useEffect(() => {
    latestContextRef.current = {
      settings,
      lastSeenCommentAt,
      lastNotifiedCommentAt,
    };
  }, [settings, lastSeenCommentAt, lastNotifiedCommentAt]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [storedSettings, seenAt, notifiedAt] = await Promise.all([
          loadSettings(),
          loadLastSeenCommentAt(),
          loadLastNotifiedCommentAt(),
        ]);

        setSettings(storedSettings);
        setSettingsDraft(storedSettings);
        setLastSeenCommentAt(seenAt);
        setLastNotifiedCommentAt(notifiedAt);
      } catch (error) {
        setSnapshot((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Erreur de chargement local",
        }));
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const handlePollerResult = useCallback(async (result: PollerResult) => {
    setSnapshot(result.snapshot);
    setIsLoading(false);
    setIsRefreshing(false);

    if (
      result.nextLastNotifiedCommentAt &&
      result.nextLastNotifiedCommentAt !== latestContextRef.current.lastNotifiedCommentAt
    ) {
      setLastNotifiedCommentAt(result.nextLastNotifiedCommentAt);
      await saveLastNotifiedCommentAt(result.nextLastNotifiedCommentAt);
    }
  }, []);

  useEffect(() => {
    if (!hasValidSettings(settings)) {
      setSnapshot(EMPTY_SNAPSHOT);
      return;
    }

    pollerRef.current?.stop();

    const poller = createGitLabPoller({
      getContext: () => ({ ...latestContextRef.current }),
      onResult: handlePollerResult,
    });

    pollerRef.current = poller;
    setIsLoading(true);
    poller.start();

    return () => {
      poller.stop();
    };
  }, [settings, handlePollerResult]);

  useEffect(() => {
    if (activeTab !== "comments") {
      return;
    }

    const now = new Date().toISOString();
    setLastSeenCommentAt(now);
    void saveLastSeenCommentAt(now);
    setSnapshot((current) => ({ ...current, unreadCount: 0 }));
  }, [activeTab]);

  const handleManualRefresh = useCallback(() => {
    if (!pollerRef.current) {
      return;
    }

    setIsRefreshing(true);
    pollerRef.current.refresh();
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setIsSavingSettings(true);
    setTestConnectionResult(null);

    try {
      await saveSettings(settingsDraft);
      setSettings(settingsDraft);
      setIsSettingsOpen(false);
    } catch (error) {
      setTestConnectionResult(error instanceof Error ? error.message : "Impossible d'enregistrer");
    } finally {
      setIsSavingSettings(false);
    }
  }, [settingsDraft]);

  const handleTestConnection = useCallback(async () => {
    setIsTestingConnection(true);
    setTestConnectionResult(null);

    try {
      const user = await testGitLabConnection(settingsDraft);
      setTestConnectionResult(`Connexion OK: ${user.name} (@${user.username})`);
    } catch (error) {
      setTestConnectionResult(
        error instanceof Error ? error.message : "Échec du test de connexion",
      );
    } finally {
      setIsTestingConnection(false);
    }
  }, [settingsDraft]);

  const openItem = useCallback(async (url: string) => {
    try {
      await openUrl(url);
    } catch (error) {
      setSnapshot((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Impossible d'ouvrir le lien",
      }));
    }
  }, []);

  const canRefresh = useMemo(() => hasValidSettings(settings), [settings]);

  return (
    <>
      <TrayPopover
        activeTab={activeTab}
        isRefreshing={isRefreshing}
        loading={isLoading}
        snapshot={snapshot}
        onManualRefresh={handleManualRefresh}
        onOpenComment={openItem}
        onOpenMr={openItem}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRetry={handleManualRefresh}
        onTabChange={setActiveTab}
      />

      <SettingsModal
        draft={settingsDraft}
        isOpen={isSettingsOpen}
        isSaving={isSavingSettings}
        isTestingConnection={isTestingConnection}
        testConnectionResult={testConnectionResult}
        onChange={setSettingsDraft}
        onOpenChange={setIsSettingsOpen}
        onSave={handleSaveSettings}
        onTestConnection={handleTestConnection}
      />

      {!canRefresh && (
        <div className="settings-hint">
          Configure ton URL GitLab et ton token pour démarrer la synchronisation.
        </div>
      )}
    </>
  );
}

export default App;
