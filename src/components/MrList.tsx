import { Button, Card, Skeleton } from "@heroui/react";
import type { MergeRequestItem } from "../lib/types";

interface MrListProps {
  mrs: MergeRequestItem[];
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
      <Skeleton className="h-11 rounded-lg" />
      <Skeleton className="h-11 rounded-lg" />
      <Skeleton className="h-11 rounded-lg" />
      <Skeleton className="h-11 rounded-lg" />
    </div>
  );
}

export function MrList({ mrs, loading, error, onOpen, onRetry }: MrListProps) {
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

  if (mrs.length === 0) {
    return (
      <Card>
        <Card.Content className="p-3 text-sm text-muted">
          Aucune MR assignée ou en review.
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="linear-list">
      {mrs.map((mr) => (
        <button key={mr.id} className="linear-item" type="button" onClick={() => onOpen(mr.webUrl)}>
          <div className="linear-item-head">
            <span className="linear-item-title">!{mr.iid} · {mr.title}</span>
            <span className="linear-item-meta">{formatRelativeTime(mr.updatedAt)}</span>
          </div>
          <p className="linear-item-body">{mr.authorName}</p>
        </button>
      ))}
    </div>
  );
}
