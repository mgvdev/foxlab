import { Button } from "@/components/ui/button";
import type { TicketItem } from "@/lib/types";

interface CycleStats {
  completedCycles: number;
  totalSeconds: number;
  inProgressSeconds: number;
}

interface StatsTicketRowProps {
  ticket: TicketItem;
  cycleConfigured: boolean;
  cycleStats: CycleStats | undefined;
  isFocused: boolean;
  onOpen: (url: string) => void;
  formatDuration: (seconds: number) => string;
}

export function StatsTicketRow({
  ticket,
  cycleConfigured,
  cycleStats,
  isFocused,
  onOpen,
  formatDuration,
}: StatsTicketRowProps) {
  const ratio =
    ticket.timeEstimateSeconds > 0
      ? ticket.totalTimeSpentSeconds / ticket.timeEstimateSeconds
      : 0;
  const percent = ticket.timeEstimateSeconds > 0 ? Math.round(ratio * 100) : 0;

  return (
    <article className={`stats-ticket-row ${isFocused ? "is-focused" : ""}`}>
      <div className="stats-ticket-head">
        <button className="stats-ticket-title" type="button" onClick={() => onOpen(ticket.webUrl)}>
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
        <Button size="sm" variant="secondary" onClick={() => onOpen(ticket.webUrl)}>
          Open
        </Button>
      </div>
    </article>
  );
}
