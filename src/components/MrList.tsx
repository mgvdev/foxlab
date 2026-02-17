import { Button, Card, Skeleton } from "@heroui/react";
import type { MergeRequestItem } from "../lib/types";

interface MrListProps {
  mrs: MergeRequestItem[];
  loading: boolean;
  error: string | null;
  onOpen: (url: string) => void;
  onRetry: () => void;
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
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
        <Card.Content className="flex flex-col gap-3 p-3">
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
    <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
      {mrs.map((mr) => (
        <Button
          key={mr.id}
          className="h-auto justify-start px-3 py-2 text-left"
          variant="tertiary"
          onPress={() => onOpen(mr.webUrl)}
        >
          <div className="flex w-full flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">!{mr.iid} · {mr.title}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{mr.authorName}</span>
              <span>{new Date(mr.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}
