import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import {
  fetchAssignedTickets,
  fetchCurrentUser,
  fetchRecentComments,
  fetchTrackedMergeRequests,
} from "./gitlab";
import { computeUnreadCount, getLatestCommentTimestamp, getNewCommentsSince } from "./state";
import type { AppSnapshot, Settings } from "./types";

interface PollerContext {
  settings: Settings;
  lastSeenCommentAt: string | null;
  lastNotifiedCommentAt: string | null;
}

export interface PollerResult {
  snapshot: AppSnapshot;
  nextLastNotifiedCommentAt: string | null;
}

interface PollerHandlers {
  getContext: () => PollerContext;
  onResult: (result: PollerResult) => Promise<void> | void;
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (await isPermissionGranted()) {
    return true;
  }

  return (await requestPermission()) === "granted";
}

async function syncOnce(context: PollerContext): Promise<PollerResult> {
  const { settings, lastSeenCommentAt, lastNotifiedCommentAt } = context;

  const [user, mrs, tickets] = await Promise.all([
    fetchCurrentUser(settings),
    fetchTrackedMergeRequests(settings),
    fetchAssignedTickets(settings),
  ]);

  const comments = await fetchRecentComments(settings, mrs);
  const unreadCount = computeUnreadCount(comments, lastSeenCommentAt);

  const incomingComments = getNewCommentsSince(comments, lastNotifiedCommentAt).filter(
    (comment) => comment.authorId !== user.id,
  );

  let nextLastNotifiedCommentAt = lastNotifiedCommentAt;

  if (incomingComments.length > 0 && (await ensureNotificationPermission())) {
    for (const comment of incomingComments) {
      sendNotification({
        title: `Nouveau commentaire sur MR !${comment.mrIid}`,
        body: `${comment.authorName}: ${comment.body.slice(0, 120)}`,
      });
    }

    nextLastNotifiedCommentAt = getLatestCommentTimestamp(incomingComments);
  }

  return {
    snapshot: {
      mrs,
      comments,
      tickets,
      unreadCount,
      lastSyncAt: new Date().toISOString(),
      error: null,
    },
    nextLastNotifiedCommentAt,
  };
}

export function createGitLabPoller(handlers: PollerHandlers) {
  let timer: number | null = null;
  let inFlight = false;
  let stopped = false;

  const clearTimer = () => {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = (delayMs: number) => {
    clearTimer();
    timer = window.setTimeout(() => {
      void run(false);
    }, delayMs);
  };

  const run = async (manual: boolean): Promise<void> => {
    if (stopped || inFlight) {
      return;
    }

    inFlight = true;

    try {
      const context = handlers.getContext();
      const result = await syncOnce(context);
      await handlers.onResult(result);

      const intervalMs = context.settings.pollIntervalMinutes * 60_000;
      schedule(intervalMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inattendue";
      await handlers.onResult({
        snapshot: {
          mrs: [],
          comments: [],
          tickets: [],
          unreadCount: 0,
          lastSyncAt: new Date().toISOString(),
          error: message,
        },
        nextLastNotifiedCommentAt: handlers.getContext().lastNotifiedCommentAt,
      });

      if (!manual) {
        schedule(30_000);
      }
    } finally {
      inFlight = false;
    }
  };

  return {
    start() {
      stopped = false;
      void run(false);
    },
    stop() {
      stopped = true;
      clearTimer();
    },
    refresh() {
      void run(true);
    },
  };
}
