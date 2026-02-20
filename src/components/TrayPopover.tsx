import { Button, Chip } from "@heroui/react";
import { CommentsList } from "./CommentsList";
import { MrList } from "./MrList";
import { TicketList } from "./TicketList";
import type {
  AppSnapshot,
  MergeRequestCiStatus,
  MergeRequestDiscussionNote,
  MergeRequestItem,
  TicketItem,
} from "../lib/types";

export type ActiveTab = "comments" | "mrs" | "tickets";

interface TrayPopoverProps {
  snapshot: AppSnapshot;
  loading: boolean;
  activeTab: ActiveTab;
  isRefreshing: boolean;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onManualRefresh: () => void;
  onRetry: () => void;
  onOpenComment: (url: string) => void;
  onOpenMr: (url: string) => void;
  onOpenTicket: (url: string) => void;
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

export function TrayPopover({
  snapshot,
  loading,
  activeTab,
  isRefreshing,
  onTabChange,
  onOpenSettings,
  onManualRefresh,
  onRetry,
  onOpenComment,
  onOpenMr,
  onOpenTicket,
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
        <div>
          <p className="text-sm font-semibold">GitLab Companion</p>
          <p className="text-xs text-muted">
            {snapshot.lastSyncAt
              ? `Sync ${new Date(snapshot.lastSyncAt).toLocaleTimeString()}`
              : "Pas encore synchronisé"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onPress={onManualRefresh}>
            {isRefreshing ? "..." : "↻"}
          </Button>
          <Button size="sm" variant="secondary" onPress={onOpenSettings}>
            ⚙
          </Button>
        </div>
      </header>

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

        <Chip color="accent" size="sm" variant="soft">
          {snapshot.unreadCount}
        </Chip>
      </section>

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
            onRetry={onRetry}
            onAddSpentTime={onAddTicketSpentTime}
            onSetEstimate={onSetTicketEstimate}
          />
        )}
      </section>
    </main>
  );
}
