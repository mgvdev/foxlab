import { Button, Card, Skeleton } from "@heroui/react";
import type { TicketItem } from "../lib/types";

interface TicketListProps {
  tickets: TicketItem[];
  loading: boolean;
  error: string | null;
  onOpen: (url: string) => void;
  onRetry: () => void;
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - Date.parse(isoDate);
  const minutes = Math.max(1, Math.floor(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
    </div>
  );
}

export function TicketList({ tickets, loading, error, onOpen, onRetry }: TicketListProps) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <Card>
        <Card.Content className="flex flex-col gap-2 p-3">
          <p className="text-sm text-danger">{error}</p>
          <Button size="sm" onPress={onRetry}>
            Retry
          </Button>
        </Card.Content>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <Card.Content className="p-3 text-sm text-muted">Aucun ticket assigné.</Card.Content>
      </Card>
    );
  }

  return (
    <div className="linear-list">
      {tickets.map((ticket) => (
        <button key={ticket.id} className="linear-item" type="button" onClick={() => onOpen(ticket.webUrl)}>
          <div className="linear-item-head">
            <span className="linear-item-title">#{ticket.iid} · {ticket.title}</span>
            <span className="linear-item-meta">{formatRelativeTime(ticket.updatedAt)}</span>
          </div>
          <div className="linear-labels">
            {ticket.labels.length === 0 ? (
              <span className="linear-label linear-label--empty">No label</span>
            ) : (
              ticket.labels.slice(0, 4).map((label) => (
                <span key={`${ticket.id}-${label}`} className="linear-label">
                  {label}
                </span>
              ))
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
