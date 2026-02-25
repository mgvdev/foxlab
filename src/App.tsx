import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SettingsWindow } from "./components/SettingsWindow";
import { StatsWindow } from "./components/StatsWindow";
import { TrayPopover, type ActiveTab } from "./components/TrayPopover";
import {
  addTicketSpentTime,
  fetchMergeRequestCiStatus,
  fetchMergeRequestDiscussionNotes,
  fetchTicketTimeStats,
  playCiJob,
  setTicketTimeEstimate,
} from "./lib/gitlab";
import { createGitLabPoller, type PollerResult } from "./lib/poller";
import {
  loadLastNotifiedCommentAt,
  loadLastSeenCommentAt,
  loadSettings,
  saveLastNotifiedCommentAt,
  saveLastSeenCommentAt,
  saveSettings,
} from "./lib/store";
import { openSettingsWindow, openStatsWindow } from "./lib/windows";
import {
  DEFAULT_SETTINGS,
  type AppSnapshot,
  type MergeRequestItem,
  type Settings,
  type TicketItem,
} from "./lib/types";
import "./App.css";

const EMPTY_SNAPSHOT: AppSnapshot = {
  mrs: [],
  comments: [],
  tickets: [],
  unreadCount: 0,
  lastSyncAt: null,
  error: null,
};

function hasValidSettings(settings: Settings): boolean {
  return (
    settings.gitlabBaseUrl.trim().length > 0 && settings.personalAccessToken.trim().length > 0
  );
}

function MainWindowApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(EMPTY_SNAPSHOT);
  const [activeTab, setActiveTab] = useState<ActiveTab>("comments");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void getCurrentWebviewWindow()
      .listen("settings:updated", async () => {
        try {
          const storedSettings = await loadSettings();
          setSettings(storedSettings);
        } catch (error) {
          setSnapshot((current) => ({
            ...current,
            error: error instanceof Error ? error.message : "Impossible de recharger les réglages",
          }));
        }
      })
      .then((dispose) => {
        unlisten = dispose;
      });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
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

  const handleLoadMrComments = useCallback(
    (mr: MergeRequestItem) => fetchMergeRequestDiscussionNotes(settings, mr),
    [settings],
  );
  const handleLoadMrCi = useCallback(
    (mr: MergeRequestItem) => fetchMergeRequestCiStatus(settings, mr),
    [settings],
  );
  const handlePlayCiJob = useCallback(
    (projectId: number, jobId: number) => playCiJob(settings, projectId, jobId),
    [settings],
  );

  const handleAddTicketSpentTime = useCallback(
    async (ticket: TicketItem, duration: string) => {
      try {
        await addTicketSpentTime(settings, ticket, duration);
        const refreshedStats = await fetchTicketTimeStats(settings, ticket);

        setSnapshot((current) => ({
          ...current,
          tickets: current.tickets.map((candidate) =>
            candidate.id === ticket.id ? { ...candidate, ...refreshedStats } : candidate,
          ),
          error: null,
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Impossible d'ajouter le temps passé";

        setSnapshot((current) => ({
          ...current,
          error: message,
        }));

        throw new Error(message);
      }
    },
    [settings],
  );

  const handleSetTicketEstimate = useCallback(
    async (ticket: TicketItem, duration: string) => {
      try {
        await setTicketTimeEstimate(settings, ticket, duration);
        const refreshedStats = await fetchTicketTimeStats(settings, ticket);

        setSnapshot((current) => ({
          ...current,
          tickets: current.tickets.map((candidate) =>
            candidate.id === ticket.id ? { ...candidate, ...refreshedStats } : candidate,
          ),
          error: null,
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Impossible de modifier l'estimate";

        setSnapshot((current) => ({
          ...current,
          error: message,
        }));

        throw new Error(message);
      }
    },
    [settings],
  );

  const handleToggleMuteMrIid = useCallback((iid: number) => {
    setSettings((current) => {
      const muted = current.mutedMrIids.includes(iid);
      const next = {
        ...current,
        mutedMrIids: muted
          ? current.mutedMrIids.filter((value) => value !== iid)
          : [...current.mutedMrIids, iid],
      };

      void saveSettings(next).catch((error) => {
        setSnapshot((snapshotState) => ({
          ...snapshotState,
          error: error instanceof Error ? error.message : "Impossible de sauvegarder le masquage MR",
        }));
      });

      return next;
    });
  }, []);

  const handleOpenSettingsWindow = useCallback(() => {
    void openSettingsWindow().catch((error) => {
      setSnapshot((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Impossible d'ouvrir la fenêtre settings",
      }));
    });
  }, []);

  const handleOpenStatsWindow = useCallback(() => {
    void openStatsWindow().catch((error) => {
      setSnapshot((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Impossible d'ouvrir la fenêtre stats",
      }));
    });
  }, []);

  const handleOpenTicketStats = useCallback((ticket: TicketItem) => {
    void openStatsWindow({
      ticketId: ticket.id,
      ticketIid: ticket.iid,
      projectId: ticket.projectId,
    }).catch((error) => {
      setSnapshot((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Impossible d'ouvrir les stats ticket",
      }));
    });
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
        onOpenTicket={openItem}
        onOpenTicketStats={handleOpenTicketStats}
        onLoadMrComments={handleLoadMrComments}
        onLoadMrCi={handleLoadMrCi}
        onPlayCiJob={handlePlayCiJob}
        onAddTicketSpentTime={handleAddTicketSpentTime}
        onSetTicketEstimate={handleSetTicketEstimate}
        mutedMrIids={settings.mutedMrIids}
        onToggleMuteMrIid={handleToggleMuteMrIid}
        showCommentAvatars={settings.showCommentAvatars}
        onOpenSettings={handleOpenSettingsWindow}
        onOpenStatsWindow={handleOpenStatsWindow}
        onRetry={handleManualRefresh}
        onTabChange={setActiveTab}
      />

      {!canRefresh && (
        <div className="settings-hint">
          Configure ton URL GitLab et ton token pour démarrer la synchronisation.
        </div>
      )}
    </>
  );
}

function resolveWindowLabel(): string {
  try {
    return getCurrentWebviewWindow().label;
  } catch {
    return "main";
  }
}

function App() {
  const windowLabel = useMemo(() => resolveWindowLabel(), []);

  if (windowLabel === "settings") {
    return <SettingsWindow />;
  }

  if (windowLabel === "stats") {
    return <StatsWindow />;
  }

  return <MainWindowApp />;
}

export default App;
