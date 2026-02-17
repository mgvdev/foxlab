import { Button, Card, Skeleton } from "@heroui/react";
import type { CommentItem } from "../lib/types";

interface CommentsListProps {
  comments: CommentItem[];
  loading: boolean;
  error: string | null;
  onOpen: (url: string) => void;
  onRetry: () => void;
  showAvatars: boolean;
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

export function CommentsList({
  comments,
  loading,
  error,
  onOpen,
  onRetry,
  showAvatars,
}: CommentsListProps) {
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
    <div className="linear-list">
      {comments.map((comment) => (
        <button key={comment.key} className="linear-item" type="button" onClick={() => onOpen(comment.webUrl)}>
          <div className="linear-item-head comment-row-head">
            <div className="comment-head-main">
              {showAvatars && (
                comment.authorAvatarUrl ? (
                  <img
                    alt={comment.authorName}
                    className="comment-avatar"
                    src={comment.authorAvatarUrl}
                  />
                ) : (
                  <span className="comment-avatar comment-avatar-fallback">{initials(comment.authorName)}</span>
                )
              )}
              <span className="linear-item-title">MR !{comment.mrIid}</span>
            </div>
            <span className="linear-item-meta">{comment.authorName} · {formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="linear-item-body">{comment.body || "(sans contenu)"}</p>
        </button>
      ))}
    </div>
  );
}
