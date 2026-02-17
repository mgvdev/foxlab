import { useMemo, useState } from "react";
import { Button, Card, Chip, Skeleton } from "@heroui/react";
import type {
  MergeRequestDiscussionNote,
  MergeRequestItem,
} from "../lib/types";

interface MrListProps {
  mrs: MergeRequestItem[];
  loading: boolean;
  error: string | null;
  onOpen: (url: string) => void;
  onRetry: () => void;
  onLoadComments: (mr: MergeRequestItem) => Promise<MergeRequestDiscussionNote[]>;
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

export function MrList({
  mrs,
  loading,
  error,
  onOpen,
  onRetry,
  onLoadComments,
}: MrListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [commentCache, setCommentCache] = useState<Record<number, MergeRequestDiscussionNote[]>>(
    {},
  );
  const [loadingByMr, setLoadingByMr] = useState<Record<number, boolean>>({});
  const [errorByMr, setErrorByMr] = useState<Record<number, string | null>>({});

  const toggleMr = async (mr: MergeRequestItem) => {
    const nextExpanded = new Set(expandedIds);
    const isOpen = nextExpanded.has(mr.id);

    if (isOpen) {
      nextExpanded.delete(mr.id);
      setExpandedIds(nextExpanded);
      return;
    }

    nextExpanded.add(mr.id);
    setExpandedIds(nextExpanded);

    if (commentCache[mr.id] || loadingByMr[mr.id]) {
      return;
    }

    setLoadingByMr((current) => ({ ...current, [mr.id]: true }));
    setErrorByMr((current) => ({ ...current, [mr.id]: null }));

    try {
      const comments = await onLoadComments(mr);
      setCommentCache((current) => ({ ...current, [mr.id]: comments }));
    } catch (loadError) {
      setErrorByMr((current) => ({
        ...current,
        [mr.id]: loadError instanceof Error ? loadError.message : "Erreur chargement commentaires",
      }));
    } finally {
      setLoadingByMr((current) => ({ ...current, [mr.id]: false }));
    }
  };

  const orderedMrs = useMemo(() => mrs, [mrs]);

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
      {orderedMrs.map((mr) => {
        const isExpanded = expandedIds.has(mr.id);
        const notes = commentCache[mr.id] ?? [];
        const isLoadingComments = loadingByMr[mr.id] ?? false;
        const mrError = errorByMr[mr.id];

        return (
          <div key={mr.id} className="mr-accordion-item">
            <button className="linear-item mr-item-trigger" type="button" onClick={() => void toggleMr(mr)}>
              <div className="linear-item-head">
                <span className="linear-item-title">!{mr.iid} · {mr.title}</span>
                <span className="linear-item-meta mr-head-meta">
                  <span>{formatRelativeTime(mr.updatedAt)}</span>
                  <span className={`mr-arrow ${isExpanded ? "is-open" : ""}`}>▾</span>
                </span>
              </div>
              <p className="linear-item-body">{mr.authorName}</p>
            </button>

            {isExpanded && (
              <div className="mr-comments-panel">
                {isLoadingComments ? (
                  <div className="flex flex-col gap-1.5 px-2 pb-2">
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-10 rounded-lg" />
                  </div>
                ) : mrError ? (
                  <div className="px-2 pb-2">
                    <p className="text-xs text-danger">{mrError}</p>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="px-2 pb-2 text-xs text-muted">Aucun commentaire pour cette MR.</div>
                ) : (
                  <div className="mr-comment-list">
                    {notes.slice(0, 20).map((note) => (
                      <button
                        key={`${mr.id}-${note.id}`}
                        className="mr-comment-item"
                        type="button"
                        onClick={() => onOpen(note.webUrl)}
                      >
                        <div className="mr-comment-head">
                          <span className="mr-comment-author">{note.authorName}</span>
                          <div className="flex items-center gap-1.5">
                            {note.resolvable ? (
                              <Chip
                                className="mr-status-chip"
                                color={note.resolved ? "success" : "warning"}
                                size="sm"
                                variant="soft"
                              >
                                {note.resolved ? "resolved" : "unresolved"}
                              </Chip>
                            ) : (
                              <Chip className="mr-status-chip" color="default" size="sm" variant="soft">
                                note
                              </Chip>
                            )}
                            <span className="linear-item-meta">{formatRelativeTime(note.createdAt)}</span>
                          </div>
                        </div>
                        <p className="mr-comment-body">{note.body || "(sans contenu)"}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
