import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { openUrl } from "@tauri-apps/plugin-opener";
import { fetchAssignedTickets, fetchTicketLabelEvents, type TicketLabelEvent } from "../lib/gitlab";
import { loadSettings } from "../lib/store";
import type { Settings, TicketItem } from "../lib/types";
import { openSettingsWindow, type StatsFocusTicketPayload } from "../lib/windows";

interface TicketCycleStats {
  completedCycles: number;
  totalSeconds: number;
  inProgressSeconds: number;
}

function hasValidSettings(settings: Settings): boolean {
  return (
    settings.gitlabBaseUrl.trim().length > 0 && settings.personalAccessToken.trim().length > 0
  );
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0m";
  }

  const totalMinutes = Math.floor(seconds / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const chunks: string[] = [];

  if (days > 0) {
    chunks.push(`${days}d`);
  }
  if (hours > 0) {
    chunks.push(`${hours}h`);
  }
  if (minutes > 0 || chunks.length === 0) {
    chunks.push(`${minutes}m`);
  }

  return chunks.join(" ");
}

function computeTicketCycleStats(
  events: TicketLabelEvent[],
  startLabel: string,
  endLabel: string,
): TicketCycleStats {
  if (!startLabel || !endLabel || startLabel === endLabel) {
    return {
      completedCycles: 0,
      totalSeconds: 0,
      inProgressSeconds: 0,
    };
  }

  let currentStartMs: number | null = null;
  let completedCycles = 0;
  let totalMs = 0;

  for (const event of events) {
    if (event.action !== "add") {
      continue;
    }

    if (event.label === startLabel) {
      if (currentStartMs === null) {
        currentStartMs = Date.parse(event.createdAt);
      }
      continue;
    }

    if (event.label === endLabel && currentStartMs !== null) {
      const endMs = Date.parse(event.createdAt);
      if (Number.isFinite(endMs) && endMs > currentStartMs) {
        totalMs += endMs - currentStartMs;
        completedCycles += 1;
      }
      currentStartMs = null;
    }
  }

  const inProgressMs = currentStartMs ? Math.max(0, Date.now() - currentStartMs) : 0;

  return {
    completedCycles,
    totalSeconds: Math.floor(totalMs / 1000),
    inProgressSeconds: Math.floor(inProgressMs / 1000),
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const maxWorkers = Math.max(1, limit);
  const results = new Array<R>(items.length);
  let index = 0;

  const workers = Array.from({ length: maxWorkers }, async () => {
    while (true) {
      const currentIndex = index;
      index += 1;
      if (currentIndex >= items.length) {
        return;
      }
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

function ticketKey(ticket: TicketItem): string {
  return `${ticket.projectId}:${ticket.iid}`;
}

export function StatsWindow() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [cycleStatsByTicket, setCycleStatsByTicket] = useState<Record<string, TicketCycleStats>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedTicketKey, setFocusedTicketKey] = useState<string | null>(null);

  const ticketRefs = useRef<Record<string, HTMLElement | null>>({});

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextSettings = await loadSettings();
      setSettings(nextSettings);

      if (!hasValidSettings(nextSettings)) {
        setTickets([]);
        setCycleStatsByTicket({});
        return;
      }

      const fetchedTickets = await fetchAssignedTickets(nextSettings);
      setTickets(fetchedTickets);

      const startLabel = nextSettings.cycleStartLabel.trim();
      const endLabel = nextSettings.cycleEndLabel.trim();

      if (!startLabel || !endLabel || startLabel === endLabel) {
        setCycleStatsByTicket({});
        return;
      }

      const cycleEntries = await mapWithConcurrency(fetchedTickets, 4, async (ticket) => {
        const key = ticketKey(ticket);
        try {
          const events = await fetchTicketLabelEvents(nextSettings, ticket);
          return [key, computeTicketCycleStats(events, startLabel, endLabel)] as const;
        } catch {
          return [
            key,
            {
              completedCycles: 0,
              totalSeconds: 0,
              inProgressSeconds: 0,
            },
          ] as const;
        }
      });

      const byKey: Record<string, TicketCycleStats> = {};
      for (const [key, value] of cycleEntries) {
        byKey[key] = value;
      }
      setCycleStatsByTicket(byKey);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les stats.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    const intervalMs = Math.max(1, settings.pollIntervalMinutes) * 60_000;
    const interval = window.setInterval(() => {
      void loadStats();
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [settings, loadStats]);

  useEffect(() => {
    let unlistenFocus: (() => void) | undefined;
    let unlistenSettings: (() => void) | undefined;

    void getCurrentWebviewWindow()
      .listen<StatsFocusTicketPayload>("stats:focus-ticket", (event) => {
        const payload = event.payload;
        if (!payload) {
          return;
        }
        setFocusedTicketKey(`${payload.projectId}:${payload.ticketIid}`);
      })
      .then((unlisten) => {
        unlistenFocus = unlisten;
      });

    void getCurrentWebviewWindow()
      .listen("settings:updated", () => {
        void loadStats();
      })
      .then((unlisten) => {
        unlistenSettings = unlisten;
      });

    return () => {
      if (unlistenFocus) {
        unlistenFocus();
      }
      if (unlistenSettings) {
        unlistenSettings();
      }
    };
  }, [loadStats]);

  useEffect(() => {
    if (!focusedTicketKey) {
      return;
    }

    const target = ticketRefs.current[focusedTicketKey];
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedTicketKey, tickets]);

  const summary = useMemo(() => {
    const totalSpentSeconds = tickets.reduce((acc, ticket) => acc + ticket.totalTimeSpentSeconds, 0);
    const totalEstimateSeconds = tickets.reduce((acc, ticket) => acc + ticket.timeEstimateSeconds, 0);
    const ticketsWithEstimate = tickets.filter((ticket) => ticket.timeEstimateSeconds > 0).length;
    const overrunCount = tickets.filter(
      (ticket) =>
        ticket.timeEstimateSeconds > 0 && ticket.totalTimeSpentSeconds > ticket.timeEstimateSeconds,
    ).length;
    const totalCycleSeconds = Object.values(cycleStatsByTicket).reduce(
      (acc, cycleStats) => acc + cycleStats.totalSeconds,
      0,
    );
    const activeCycleCount = Object.values(cycleStatsByTicket).filter(
      (cycleStats) => cycleStats.inProgressSeconds > 0,
    ).length;
    const completedCycleCount = Object.values(cycleStatsByTicket).reduce(
      (acc, cycleStats) => acc + cycleStats.completedCycles,
      0,
    );

    return {
      totalSpentSeconds,
      totalEstimateSeconds,
      ticketsWithEstimate,
      overrunCount,
      totalCycleSeconds,
      activeCycleCount,
      completedCycleCount,
    };
  }, [tickets, cycleStatsByTicket]);

  const cycleConfigured =
    Boolean(settings?.cycleStartLabel.trim()) &&
    Boolean(settings?.cycleEndLabel.trim()) &&
    settings?.cycleStartLabel.trim() !== settings?.cycleEndLabel.trim();

  return (
    <main className="window-shell">
      <section className="window-card stats-window">
        <header className="window-head">
          <div>
            <h1 className="window-title">Stats Time Tracking</h1>
            <p className="window-subtitle">
              Tickets assignés, estimation, overrun, et cycle label-based.
            </p>
          </div>
          <div className="window-actions-inline">
            <Button size="sm" variant="secondary" onPress={() => void openSettingsWindow()}>
              Settings
            </Button>
            <Button size="sm" variant="secondary" onPress={() => void loadStats()}>
              {isLoading ? "..." : "↻"}
            </Button>
            <Button size="sm" variant="secondary" onPress={() => void getCurrentWebviewWindow().close()}>
              Fermer
            </Button>
          </div>
        </header>

        {!settings || !hasValidSettings(settings) ? (
          <div className="window-empty">
            Configure l’URL GitLab et le token dans la fenêtre Settings.
          </div>
        ) : (
          <>
            <section className="stats-metrics-grid">
              <article className="stats-metric-card">
                <p className="stats-metric-label">Total spent</p>
                <p className="stats-metric-value">{formatDuration(summary.totalSpentSeconds)}</p>
              </article>
              <article className="stats-metric-card">
                <p className="stats-metric-label">Total estimate</p>
                <p className="stats-metric-value">{formatDuration(summary.totalEstimateSeconds)}</p>
              </article>
              <article className="stats-metric-card">
                <p className="stats-metric-label">Overrun tickets</p>
                <p className="stats-metric-value">{summary.overrunCount}</p>
              </article>
              <article className="stats-metric-card">
                <p className="stats-metric-label">Tickets with estimate</p>
                <p className="stats-metric-value">
                  {summary.ticketsWithEstimate} / {tickets.length}
                </p>
              </article>
              <article className="stats-metric-card">
                <p className="stats-metric-label">Cycle time cumulé</p>
                <p className="stats-metric-value">{formatDuration(summary.totalCycleSeconds)}</p>
              </article>
              <article className="stats-metric-card">
                <p className="stats-metric-label">Cycles</p>
                <p className="stats-metric-value">
                  {summary.completedCycleCount} done / {summary.activeCycleCount} en cours
                </p>
              </article>
            </section>

            {!cycleConfigured && (
              <p className="window-status">
                Configure `cycleStartLabel` et `cycleEndLabel` pour activer le calcul du cycle réel.
              </p>
            )}

            {error && <p className="window-status window-status-error">{error}</p>}

            <section className="stats-ticket-list">
              {tickets.map((ticket) => {
                const key = ticketKey(ticket);
                const cycleStats = cycleStatsByTicket[key];
                const isFocused = focusedTicketKey === key;
                const ratio =
                  ticket.timeEstimateSeconds > 0
                    ? ticket.totalTimeSpentSeconds / ticket.timeEstimateSeconds
                    : 0;
                const percent = ticket.timeEstimateSeconds > 0 ? Math.round(ratio * 100) : 0;

                return (
                  <article
                    key={key}
                    ref={(node) => {
                      ticketRefs.current[key] = node;
                    }}
                    className={`stats-ticket-row ${isFocused ? "is-focused" : ""}`}
                  >
                    <div className="stats-ticket-head">
                      <button
                        className="stats-ticket-title"
                        type="button"
                        onClick={() => void openUrl(ticket.webUrl)}
                      >
                        #{ticket.iid} · {ticket.title}
                      </button>
                      <span className="stats-ticket-meta">{ticket.state}</span>
                    </div>

                    <div className="stats-ticket-values">
                      <span>Spent {ticket.humanTotalTimeSpent || "0m"}</span>
                      <span>/</span>
                      <span>Est. {ticket.timeEstimateSeconds > 0 ? ticket.humanTimeEstimate : "No estimate"}</span>
                      {ticket.timeEstimateSeconds > 0 && <span>({percent}%)</span>}
                    </div>

                    {cycleConfigured && (
                      <div className="stats-ticket-values">
                        <span>Cycle done {formatDuration(cycleStats?.totalSeconds ?? 0)}</span>
                        <span>/</span>
                        <span>In progress {formatDuration(cycleStats?.inProgressSeconds ?? 0)}</span>
                      </div>
                    )}

                    <div className="stats-ticket-actions">
                      <Button size="sm" variant="secondary" onPress={() => void openUrl(ticket.webUrl)}>
                        Open
                      </Button>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
