import { useMemo, useState } from "react";
import { Button, Card, Chip, Popover, Skeleton, Tooltip } from "@heroui/react";
import type {
  MergeRequestCiStatus,
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
  onLoadCi: (mr: MergeRequestItem) => Promise<MergeRequestCiStatus>;
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

function statusPriority(status: string): number {
  const normalized = status.toLowerCase();
  if (normalized === "failed") return 6;
  if (normalized === "canceled") return 5;
  if (normalized === "running") return 4;
  if (normalized === "pending" || normalized === "created" || normalized === "waiting_for_resource")
    return 3;
  if (normalized === "manual") return 2;
  if (normalized === "success") return 1;
  return 0;
}

function aggregateStageStatus(statuses: string[]): string {
  if (statuses.length === 0) return "none";

  let winner = statuses[0];
  for (const status of statuses.slice(1)) {
    if (statusPriority(status) > statusPriority(winner)) {
      winner = status;
    }
  }
  return winner;
}

function ciIconByStatus(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "success") return "✓";
  if (normalized === "failed" || normalized === "canceled") return "!";
  if (normalized === "running") return "▶";
  if (normalized === "pending" || normalized === "created") return "…";
  if (normalized === "manual") return "⏸";
  return "•";
}

export function MrList({
  mrs,
  loading,
  error,
  onOpen,
  onRetry,
  onLoadComments,
  onLoadCi,
}: MrListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [commentCache, setCommentCache] = useState<Record<number, MergeRequestDiscussionNote[]>>(
    {},
  );
  const [ciCache, setCiCache] = useState<Record<number, MergeRequestCiStatus>>({});
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

    if ((commentCache[mr.id] && ciCache[mr.id]) || loadingByMr[mr.id]) {
      return;
    }

    setLoadingByMr((current) => ({ ...current, [mr.id]: true }));
    setErrorByMr((current) => ({ ...current, [mr.id]: null }));

    try {
      const [comments, ci] = await Promise.all([onLoadComments(mr), onLoadCi(mr)]);
      setCommentCache((current) => ({ ...current, [mr.id]: comments }));
      setCiCache((current) => ({ ...current, [mr.id]: ci }));
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
        const ci = ciCache[mr.id];
        const isLoadingComments = loadingByMr[mr.id] ?? false;
        const mrError = errorByMr[mr.id];

        return (
          <div key={mr.id} className="mr-accordion-item">
            <div className="linear-item mr-item-trigger">
              <button className="mr-toggle-btn" type="button" onClick={() => void toggleMr(mr)}>
                <div className="linear-item-head">
                  <div className="mr-title-wrap">
                    <Tooltip delay={150}>
                      <Tooltip.Trigger aria-label={`MR !${mr.iid}`}>
                        <span className="linear-item-title">!{mr.iid} · {mr.title}</span>
                      </Tooltip.Trigger>
                      <Tooltip.Content className="mr-title-tooltip" showArrow>
                        <Tooltip.Arrow />
                        <span>!{mr.iid} · {mr.title}</span>
                      </Tooltip.Content>
                    </Tooltip>
                  </div>
                  <span className="linear-item-meta mr-head-meta">
                    <span>{formatRelativeTime(mr.updatedAt)}</span>
                    <span className={`mr-arrow ${isExpanded ? "is-open" : ""}`}>▾</span>
                  </span>
                </div>
                <p className="linear-item-body">{mr.authorName}</p>
              </button>
              <button className="mr-open-btn" type="button" onClick={() => onOpen(mr.webUrl)}>
                Open
              </button>
            </div>

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
                ) : (
                  <>
                    <div className="mr-ci-panel">
                      <div className="mr-ci-head">
                        <span className="mr-ci-title">CI</span>
                        <div className="flex items-center gap-1.5">
                          <Chip className="mr-status-chip" color="default" size="sm" variant="soft">
                            {ci?.status ?? "unknown"}
                          </Chip>
                          {ci?.webUrl && (
                            <button className="mr-inline-link" type="button" onClick={() => onOpen(ci.webUrl!)}>
                              Open pipeline
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mr-ci-icons">
                        {(ci?.stages ?? []).map((stage) => {
                          const stageStatus = aggregateStageStatus(
                            stage.jobs.map((job) => job.status),
                          );

                          return (
                            <Popover key={`${mr.id}-${stage.name}`}>
                              <Popover.Trigger aria-label={`Stage ${stage.name}`}>
                                <button
                                  className={`mr-ci-icon mr-ci-icon--${stageStatus.toLowerCase()}`}
                                  type="button"
                                >
                                  <span>{ciIconByStatus(stageStatus)}</span>
                                </button>
                              </Popover.Trigger>
                              <Popover.Content className="mr-ci-popover">
                                <Popover.Dialog>
                                  <Popover.Heading className="mr-ci-popover-title">
                                    Stage: {stage.name}
                                  </Popover.Heading>
                                  <div className="mr-ci-popover-jobs">
                                    {stage.jobs.map((job) => (
                                      <button
                                        key={`${stage.name}-${job.id}`}
                                        className="mr-ci-popover-job"
                                        type="button"
                                        onClick={() => onOpen(job.webUrl)}
                                      >
                                        <span className="mr-ci-popover-job-name">{job.name}</span>
                                        <span className="mr-ci-popover-job-status">{job.status}</span>
                                      </button>
                                    ))}
                                  </div>
                                </Popover.Dialog>
                              </Popover.Content>
                            </Popover>
                          );
                        })}
                        {ci && ci.stages.length === 0 && (
                          <p className="text-xs text-muted">Aucun job CI disponible.</p>
                        )}
                      </div>
                    </div>
                    {notes.length === 0 ? (
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
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
