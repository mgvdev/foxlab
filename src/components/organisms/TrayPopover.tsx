import { Button, Chip } from "@/components/ui/legacy";
import { CommentsList } from "./CommentsList";
import { MrList } from "./MrList";
import { TicketList } from "./TicketList";
import type {
  AppSnapshot,
  MergeRequestCiStatus,
  MergeRequestDiscussionNote,
  MergeRequestItem,
  TicketItem,
} from "@/lib/types";

export type ActiveTab = "comments" | "mrs" | "tickets";

interface TrayPopoverProps {
  snapshot: AppSnapshot;
  loading: boolean;
  activeTab: ActiveTab;
  isRefreshing: boolean;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onOpenStatsWindow: () => void;
  onManualRefresh: () => void;
  onRetry: () => void;
  onOpenComment: (url: string) => void;
  onOpenMr: (url: string) => void;
  onOpenTicket: (url: string) => void;
  onOpenTicketStats: (ticket: TicketItem) => void;
  onLoadMrComments: (mr: MergeRequestItem) => Promise<MergeRequestDiscussionNote[]>;
  onLoadMrCi: (mr: MergeRequestItem) => Promise<MergeRequestCiStatus>;
  onPlayCiJob: (projectId: number, jobId: number) => Promise<void>;
  onAddTicketSpentTime: (ticket: TicketItem, duration: string) => Promise<void>;
  onSetTicketEstimate: (ticket: TicketItem, duration: string) => Promise<void>;
  mutedMrIids: number[];
  onToggleMuteMrIid: (iid: number) => void;
  showCommentAvatars: boolean;
}

function CommentIcon() {
  return (
    <svg className="segment-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 4h14v9H8l-4 3v-3H3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MergeIcon() {
  return (
    <svg className="segment-icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="6" cy="4.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="15.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="10" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5h2c2 0 3 1 3 3v0" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 15h2c2 0 3-1 3-3v0" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg className="segment-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 6.5a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 17 6.5V9a1.5 1.5 0 1 0 0 3v2.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5V12a1.5 1.5 0 1 0 0-3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="toolbar-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M15.5 5.2V2.8m0 0h-2.4m2.4 0-2.2 2.1a6.5 6.5 0 1 0 2 5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="toolbar-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 15.5h12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="9.5" width="2.5" height="5" rx="0.8" fill="currentColor" />
      <rect x="8.75" y="7.2" width="2.5" height="7.3" rx="0.8" fill="currentColor" />
      <rect x="12.5" y="5" width="2.5" height="9.5" rx="0.8" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="toolbar-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M10 6.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm6.1 3.2-.9.5a5.6 5.6 0 0 1-.4 1l.5.9a.8.8 0 0 1-.1 1l-.7.8a.8.8 0 0 1-1 .1l-.9-.5a5.6 5.6 0 0 1-1 .4l-.5.9a.8.8 0 0 1-.8.5H9.7a.8.8 0 0 1-.8-.5l-.5-.9a5.6 5.6 0 0 1-1-.4l-.9.5a.8.8 0 0 1-1-.1l-.7-.8a.8.8 0 0 1-.1-1l.5-.9a5.6 5.6 0 0 1-.4-1l-.9-.5a.8.8 0 0 1-.4-.7v-1a.8.8 0 0 1 .4-.7l.9-.5a5.6 5.6 0 0 1 .4-1l-.5-.9a.8.8 0 0 1 .1-1l.7-.8a.8.8 0 0 1 1-.1l.9.5a5.6 5.6 0 0 1 1-.4l.5-.9a.8.8 0 0 1 .8-.5h1.1a.8.8 0 0 1 .8.5l.5.9a5.6 5.6 0 0 1 1 .4l.9-.5a.8.8 0 0 1 1 .1l.7.8a.8.8 0 0 1 .1 1l-.5.9a5.6 5.6 0 0 1 .4 1l.9.5a.8.8 0 0 1 .4.7v1a.8.8 0 0 1-.4.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrayPopover({
  snapshot,
  loading,
  activeTab,
  isRefreshing,
  onTabChange,
  onOpenSettings,
  onOpenStatsWindow,
  onManualRefresh,
  onRetry,
  onOpenComment,
  onOpenMr,
  onOpenTicket,
  onOpenTicketStats,
  onLoadMrComments,
  onLoadMrCi,
  onPlayCiJob,
  onAddTicketSpentTime,
  onSetTicketEstimate,
  mutedMrIids,
  onToggleMuteMrIid,
  showCommentAvatars,
}: TrayPopoverProps) {
  return (
    <main className="menubar-root">
      <header className="menubar-header">
        <div className="menubar-title">
          <p className="menubar-title-main">GitLab Companion</p>
          <p className="menubar-title-sub">
            {snapshot.lastSyncAt
              ? `Sync ${new Date(snapshot.lastSyncAt).toLocaleTimeString()}`
              : "Pas encore synchronisé"}
          </p>
        </div>
        <div className="menubar-actions">
          <Button
            aria-label="Rafraîchir"
            className="menubar-action-btn"
            size="sm"
            variant="secondary"
            onPress={onManualRefresh}
          >
            {isRefreshing ? "…" : <RefreshIcon />}
          </Button>
          <Button
            aria-label="Ouvrir les stats"
            className="menubar-action-btn"
            size="sm"
            variant="secondary"
            onPress={onOpenStatsWindow}
          >
            <ChartIcon />
          </Button>
          <Button
            aria-label="Ouvrir les réglages"
            className="menubar-action-btn"
            size="sm"
            variant="secondary"
            onPress={onOpenSettings}
          >
            <SettingsIcon />
          </Button>
        </div>
      </header>
      <div className="menubar-divider" />

      <section className="switch-row">
        <div className="segment-switch" role="tablist" aria-label="Vue">
          <button
            aria-selected={activeTab === "comments"}
            className={`segment-btn ${activeTab === "comments" ? "is-active" : ""}`}
            role="tab"
            type="button"
            onClick={() => onTabChange("comments")}
          >
            <span>Commentaires</span>
            <CommentIcon />
          </button>
          <button
            aria-selected={activeTab === "mrs"}
            className={`segment-btn ${activeTab === "mrs" ? "is-active" : ""}`}
            role="tab"
            type="button"
            onClick={() => onTabChange("mrs")}
          >
            <span>MRs</span>
            <MergeIcon />
          </button>
          <button
            aria-selected={activeTab === "tickets"}
            className={`segment-btn ${activeTab === "tickets" ? "is-active" : ""}`}
            role="tab"
            type="button"
            onClick={() => onTabChange("tickets")}
          >
            <span>Tickets</span>
            <TicketIcon />
          </button>
        </div>

        <Chip className="unread-pill" color="accent" size="sm" variant="soft">
          {snapshot.unreadCount}
        </Chip>
      </section>
      <div className="menubar-divider" />

      <section className="content-zone">
        {activeTab === "comments" ? (
          <CommentsList
            comments={snapshot.comments}
            error={snapshot.error}
            loading={loading}
            onOpen={onOpenComment}
            onRetry={onRetry}
            showAvatars={showCommentAvatars}
          />
        ) : activeTab === "mrs" ? (
          <MrList
            error={snapshot.error}
            loading={loading}
            mrs={snapshot.mrs}
            onOpen={onOpenMr}
            onLoadCi={onLoadMrCi}
            onLoadComments={onLoadMrComments}
            onPlayCiJob={onPlayCiJob}
            mutedMrIids={mutedMrIids}
            onToggleMuteMrIid={onToggleMuteMrIid}
            showAvatars={showCommentAvatars}
            onRetry={onRetry}
          />
        ) : (
          <TicketList
            error={snapshot.error}
            loading={loading}
            tickets={snapshot.tickets}
            onOpen={onOpenTicket}
            onOpenStats={onOpenTicketStats}
            onRetry={onRetry}
            onAddSpentTime={onAddTicketSpentTime}
            onSetEstimate={onSetTicketEstimate}
          />
        )}
      </section>
    </main>
  );
}
