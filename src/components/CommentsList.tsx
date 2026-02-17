import { Button, Card, Skeleton } from "@heroui/react";
import type { CommentItem } from "../lib/types";

interface CommentsListProps {
  comments: CommentItem[];
  loading: boolean;
  error: string | null;
  onOpen: (url: string) => void;
  onRetry: () => void;
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}

export function CommentsList({ comments, loading, error, onOpen, onRetry }: CommentsListProps) {
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

  if (comments.length === 0) {
    return (
      <Card>
        <Card.Content className="p-3 text-sm text-muted">
          Aucun commentaire récent sur tes MRs suivies.
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
      {comments.map((comment) => (
        <Button
          key={comment.key}
          className="h-auto justify-start px-3 py-2 text-left"
          variant="tertiary"
          onPress={() => onOpen(comment.webUrl)}
        >
          <div className="flex w-full flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-xs text-muted">
              <span className="truncate">MR !{comment.mrIid}</span>
              <span>{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted">{comment.authorName}</p>
            <p className="line-clamp-2 text-sm text-foreground">{comment.body || "(sans contenu)"}</p>
          </div>
        </Button>
      ))}
    </div>
  );
}
