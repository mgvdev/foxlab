import { useState } from "react";
import { Button, Card, Skeleton } from "@/components/ui/legacy";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CommentItem } from "@/lib/types";
import { buildCommentsCorrectionPrompt } from "@/lib/mrPrompt";

interface CommentsListProps {
  comments: CommentItem[];
  loading: boolean;
  error: string | null;
  onOpen: (url: string) => void;
  onRetry: () => void;
  showAvatars: boolean;
}

const COMMENT_PREVIEW_MAX = 500;

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

async function writeToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

function previewCommentBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.length <= COMMENT_PREVIEW_MAX) {
    return trimmed;
  }

  return `${trimmed.slice(0, COMMENT_PREVIEW_MAX)}…`;
}

export function CommentsList({
  comments,
  loading,
  error,
  onOpen,
  onRetry,
  showAvatars,
}: CommentsListProps) {
  const [selectedCommentKeys, setSelectedCommentKeys] = useState<string[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const allSelected = comments.length > 0 && comments.every((comment) => selectedCommentKeys.includes(comment.key));
  const selectedComments = comments.filter((comment) => selectedCommentKeys.includes(comment.key));

  const toggleSelection = (commentKey: string) => {
    setSelectedCommentKeys((current) => {
      const selected = new Set(current);
      if (selected.has(commentKey)) {
        selected.delete(commentKey);
      } else {
        selected.add(commentKey);
      }
      return [...selected];
    });
  };

  const copyPrompt = async (source: "selection" | "all") => {
    const target = source === "all" ? comments : selectedComments;
    if (target.length === 0) {
      setCopyFeedback("Aucun commentaire à copier");
      return;
    }

    try {
      const prompt = buildCommentsCorrectionPrompt(target);
      await writeToClipboard(prompt);
      setCopyFeedback(`${target.length} commentaire(s) copié(s) (${source})`);
    } catch (error) {
      setCopyFeedback(error instanceof Error ? error.message : "Impossible de copier le prompt");
    }
  };

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
      <ScrollArea className="themed-scroll-area">
        <div className="themed-scroll-content">
          <div className="mr-comment-list">
            <div className="mr-comment-toolbar">
            <div className="mr-comment-toolbar-group">
              <button
                className="mr-inline-tool-btn"
                type="button"
                onClick={() =>
                  setSelectedCommentKeys(allSelected ? [] : comments.map((comment) => comment.key))
                }
              >
                {allSelected ? "Désélectionner" : "Tout sélectionner"}
              </button>
              <button
                className="mr-inline-tool-btn"
                type="button"
                onClick={() => setSelectedCommentKeys([])}
              >
                Effacer
              </button>
            </div>
            <div className="mr-comment-toolbar-group">
              <button
                className="mr-inline-tool-btn"
                disabled={selectedComments.length === 0}
                type="button"
                onClick={() => void copyPrompt("selection")}
              >
                Copier sélection
              </button>
              <button className="mr-inline-tool-btn" type="button" onClick={() => void copyPrompt("all")}>
                Copier tout
              </button>
            </div>
            </div>
            {copyFeedback && <p className="mr-copy-feedback">{copyFeedback}</p>}
            {comments.map((comment) => (
              <div key={comment.key} className="mr-comment-item">
                <div className="mr-comment-head comment-row-head">
                  <div className="comment-head-main">
                    <input
                      checked={selectedCommentKeys.includes(comment.key)}
                      className="mr-comment-check"
                      type="checkbox"
                      onChange={() => toggleSelection(comment.key)}
                    />
                    {showAvatars &&
                      (comment.authorAvatarUrl ? (
                        <img
                          alt={comment.authorName}
                          className="comment-avatar"
                          src={comment.authorAvatarUrl}
                        />
                      ) : (
                        <span className="comment-avatar comment-avatar-fallback">{initials(comment.authorName)}</span>
                      ))}
                    <span className="linear-item-title">MR !{comment.mrIid}</span>
                  </div>
                  <div className="comment-row-meta">
                    <span className="linear-item-meta">{comment.authorName} · {formatRelativeTime(comment.createdAt)}</span>
                    <button className="mr-inline-link" type="button" onClick={() => onOpen(comment.webUrl)}>
                      Open
                    </button>
                  </div>
                </div>
                <p className="comments-item-body">{previewCommentBody(comment.body) || "(sans contenu)"}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
