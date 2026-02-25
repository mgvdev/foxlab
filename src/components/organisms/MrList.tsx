import { useMemo, useState } from "react";
import { Button, Card, Chip, Popover, Skeleton, Tooltip } from "@/components/ui/legacy";
import type {
  MergeRequestCiStatus,
  MergeRequestDiscussionNote,
  MergeRequestItem,
} from "@/lib/types";
import { buildMrCorrectionPrompt } from "@/lib/mrPrompt";

interface MrListProps {
  mrs: MergeRequestItem[];
  loading: boolean;
  error: string | null;
  onOpen: (url: string) => void;
  onRetry: () => void;
  onLoadComments: (mr: MergeRequestItem) => Promise<MergeRequestDiscussionNote[]>;
  onLoadCi: (mr: MergeRequestItem) => Promise<MergeRequestCiStatus>;
  onPlayCiJob: (projectId: number, jobId: number) => Promise<void>;
  mutedMrIids: number[];
  onToggleMuteMrIid: (iid: number) => void;
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

function formatDiscussionReferenceLabel(note: MergeRequestDiscussionNote): string {
  if (!note.reference) {
    return "Général";
  }

  const reference = note.reference;
  const file =
    reference.oldPath && reference.newPath && reference.oldPath !== reference.newPath
      ? `${reference.oldPath} -> ${reference.newPath}`
      : reference.filePath ?? "fichier inconnu";

  if (
    reference.lineRangeStart &&
    reference.lineRangeEnd &&
    reference.lineRangeStart !== reference.lineRangeEnd
  ) {
    return `${file}:${reference.lineRangeStart}-${reference.lineRangeEnd}`;
  }

  if (reference.line) {
    return `${file}:${reference.line}`;
  }

  return file;
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

interface DiscussionThread {
  discussionId: string;
  root: MergeRequestDiscussionNote;
  replies: MergeRequestDiscussionNote[];
  latestActivityAt: string;
}

function buildDiscussionThreads(notes: MergeRequestDiscussionNote[]): DiscussionThread[] {
  const byDiscussion = new Map<string, MergeRequestDiscussionNote[]>();

  for (const note of notes) {
    const current = byDiscussion.get(note.discussionId) ?? [];
    current.push(note);
    byDiscussion.set(note.discussionId, current);
  }

  const threads = [...byDiscussion.entries()].map(([discussionId, discussionNotes]) => {
    const sortedByCreatedAt = [...discussionNotes].sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
    const root = sortedByCreatedAt.find((note) => note.isThreadRoot) ?? sortedByCreatedAt[0];
    const replies = sortedByCreatedAt.filter((note) => note.id !== root.id);
    const latestActivityAt = sortedByCreatedAt[sortedByCreatedAt.length - 1]?.createdAt ?? root.createdAt;

    return {
      discussionId,
      root,
      replies,
      latestActivityAt,
    };
  });

  return threads.sort((a, b) => Date.parse(b.latestActivityAt) - Date.parse(a.latestActivityAt));
}

export function MrList({
  mrs,
  loading,
  error,
  onOpen,
  onRetry,
  onLoadComments,
  onLoadCi,
  onPlayCiJob,
  mutedMrIids,
  onToggleMuteMrIid,
  showAvatars,
}: MrListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [commentCache, setCommentCache] = useState<Record<number, MergeRequestDiscussionNote[]>>(
    {},
  );
  const [ciCache, setCiCache] = useState<Record<number, MergeRequestCiStatus>>({});
  const [loadingByMr, setLoadingByMr] = useState<Record<number, boolean>>({});
  const [errorByMr, setErrorByMr] = useState<Record<number, string | null>>({});
  const [runningJobIds, setRunningJobIds] = useState<Set<number>>(new Set());
  const [selectedNoteIdsByMr, setSelectedNoteIdsByMr] = useState<Record<number, number[]>>({});
  const [copyFeedbackByMr, setCopyFeedbackByMr] = useState<Record<number, string | null>>({});
  const [expandedThreadIdsByMr, setExpandedThreadIdsByMr] = useState<Record<number, string[]>>({});

  const handlePlayManualJob = async (mr: MergeRequestItem, jobId: number) => {
    if (runningJobIds.has(jobId)) {
      return;
    }

    setRunningJobIds((current) => {
      const copy = new Set(current);
      copy.add(jobId);
      return copy;
    });

    try {
      await onPlayCiJob(mr.projectId, jobId);
      const refreshedCi = await onLoadCi(mr);
      setCiCache((current) => ({ ...current, [mr.id]: refreshedCi }));
    } catch (error) {
      setErrorByMr((current) => ({
        ...current,
        [mr.id]: error instanceof Error ? error.message : "Impossible de lancer le job manuel",
      }));
    } finally {
      setRunningJobIds((current) => {
        const copy = new Set(current);
        copy.delete(jobId);
        return copy;
      });
    }
  };

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

  const toggleNoteSelection = (mrId: number, noteId: number) => {
    setSelectedNoteIdsByMr((current) => {
      const selected = new Set(current[mrId] ?? []);
      if (selected.has(noteId)) {
        selected.delete(noteId);
      } else {
        selected.add(noteId);
      }

      return {
        ...current,
        [mrId]: [...selected],
      };
    });
  };

  const setAllSelections = (mrId: number, noteIds: number[]) => {
    setSelectedNoteIdsByMr((current) => ({
      ...current,
      [mrId]: noteIds,
    }));
  };

  const toggleThread = (mrId: number, discussionId: string) => {
    setExpandedThreadIdsByMr((current) => {
      const expanded = new Set(current[mrId] ?? []);

      if (expanded.has(discussionId)) {
        expanded.delete(discussionId);
      } else {
        expanded.add(discussionId);
      }

      return {
        ...current,
        [mrId]: [...expanded],
      };
    });
  };

  const copyPromptForNotes = async (
    mr: MergeRequestItem,
    notes: MergeRequestDiscussionNote[],
    source: "selection" | "all",
  ) => {
    if (notes.length === 0) {
      setCopyFeedbackByMr((current) => ({
        ...current,
        [mr.id]: "Aucun commentaire à copier",
      }));
      return;
    }

    try {
      const prompt = buildMrCorrectionPrompt(mr, notes);
      await writeToClipboard(prompt);
      setCopyFeedbackByMr((current) => ({
        ...current,
        [mr.id]: `${notes.length} commentaire(s) copié(s) (${source})`,
      }));
    } catch (error) {
      setCopyFeedbackByMr((current) => ({
        ...current,
        [mr.id]: error instanceof Error ? error.message : "Impossible de copier le prompt",
      }));
    }
  };

  const mutedSet = useMemo(() => new Set(mutedMrIids), [mutedMrIids]);

  const orderedMrs = useMemo(
    () =>
      [...mrs].sort((a, b) => {
        const aMuted = mutedSet.has(a.iid) ? 1 : 0;
        const bMuted = mutedSet.has(b.iid) ? 1 : 0;
        if (aMuted !== bMuted) {
          return aMuted - bMuted;
        }

        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }),
    [mrs, mutedSet],
  );

  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?";
  const renderNoteStatus = (note: MergeRequestDiscussionNote) =>
    note.resolvable ? (
      <Chip className="mr-status-chip" color={note.resolved ? "success" : "warning"} size="sm" variant="soft">
        {note.resolved ? "resolved" : "unresolved"}
      </Chip>
    ) : (
      <Chip className="mr-status-chip" color="default" size="sm" variant="soft">
        note
      </Chip>
    );

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
        const isMuted = mutedSet.has(mr.iid);
        const isExpanded = expandedIds.has(mr.id);
        const notes = commentCache[mr.id] ?? [];
        const displayedNotes = notes.slice(0, 20);
        const discussionThreads = buildDiscussionThreads(displayedNotes);
        const ci = ciCache[mr.id];
        const isLoadingComments = loadingByMr[mr.id] ?? false;
        const mrError = errorByMr[mr.id];
        const approvedBy = mr.approvedBy ?? [];
        const isApproved = mr.approved && approvedBy.length > 0;
        const selectedIds = selectedNoteIdsByMr[mr.id] ?? [];
        const expandedThreadIds = new Set(expandedThreadIdsByMr[mr.id] ?? []);
        const allDisplayedSelected =
          displayedNotes.length > 0 && displayedNotes.every((note) => selectedIds.includes(note.id));
        const selectedDisplayedNotes = displayedNotes.filter((note) => selectedIds.includes(note.id));
        const copyFeedback = copyFeedbackByMr[mr.id];
        return (
          <div key={mr.id} className={`mr-accordion-item ${isMuted ? "mr-muted" : ""}`}>
            <div className="linear-item mr-item-trigger">
              {isApproved ? (
                <Popover>
                  <Popover.Trigger aria-label={`MR !${mr.iid} approved`}>
                    <button className="mr-approval-trigger" type="button">
                      <span className="mr-approval-notch" />
                      <span className="mr-approval-avatars">
                        {approvedBy.slice(0, 2).map((approver) =>
                          approver.avatarUrl ? (
                            <img
                              key={`mr-${mr.id}-approver-${approver.id}`}
                              alt={approver.name}
                              className="comment-avatar mr-approval-avatar"
                              src={approver.avatarUrl}
                            />
                          ) : (
                            <span
                              key={`mr-${mr.id}-approver-${approver.id}`}
                              className="comment-avatar comment-avatar-fallback mr-approval-avatar"
                            >
                              {initials(approver.name)}
                            </span>
                          ),
                        )}
                        {approvedBy.length > 2 && (
                          <span className="mr-approval-more">+{approvedBy.length - 2}</span>
                        )}
                      </span>
                    </button>
                  </Popover.Trigger>
                  <Popover.Content className="mr-approval-popover">
                    <Popover.Dialog>
                      <Popover.Heading className="mr-approval-popover-title">
                        Approved by
                      </Popover.Heading>
                      <div className="mr-approval-popover-list">
                        {approvedBy.map((approver) => (
                          <div key={`mr-${mr.id}-approver-name-${approver.id}`} className="mr-approval-user">
                            {approver.avatarUrl ? (
                              <img
                                alt={approver.name}
                                className="comment-avatar"
                                src={approver.avatarUrl}
                              />
                            ) : (
                              <span className="comment-avatar comment-avatar-fallback">
                                {initials(approver.name)}
                              </span>
                            )}
                            <span>{approver.name}</span>
                          </div>
                        ))}
                      </div>
                    </Popover.Dialog>
                  </Popover.Content>
                </Popover>
              ) : (
                <span className="mr-approval-placeholder" />
              )}
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
              <Popover>
                <Popover.Trigger aria-label="MR actions">
                  <button className="mr-more-btn" type="button">
                    ⋯
                  </button>
                </Popover.Trigger>
                <Popover.Content className="mr-row-menu">
                  <Popover.Dialog>
                    <button
                      className="mr-row-menu-btn"
                      type="button"
                      onClick={() => onToggleMuteMrIid(mr.iid)}
                    >
                      {isMuted ? "Réafficher cette MR" : "Masquer cette MR"}
                    </button>
                  </Popover.Dialog>
                </Popover.Content>
              </Popover>
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
                                      <div key={`${stage.name}-${job.id}`} className="mr-ci-popover-job">
                                        <button
                                          className="mr-ci-popover-job-link"
                                          type="button"
                                          onClick={() => onOpen(job.webUrl)}
                                        >
                                          <span className="mr-ci-popover-job-name">{job.name}</span>
                                        </button>
                                        <div className="mr-ci-popover-job-actions">
                                          <span className="mr-ci-popover-job-status">{job.status}</span>
                                          {job.status.toLowerCase() === "manual" && (
                                            <button
                                              className="mr-ci-run-btn"
                                              type="button"
                                              onClick={() => void handlePlayManualJob(mr, job.id)}
                                            >
                                              {runningJobIds.has(job.id) ? "Running..." : "Run"}
                                            </button>
                                          )}
                                        </div>
                                      </div>
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
                    {displayedNotes.length === 0 ? (
                      <div className="px-2 pb-2 text-xs text-muted">Aucun commentaire pour cette MR.</div>
                    ) : (
                      <div className="mr-comment-list">
                        <div className="mr-comment-toolbar">
                          <div className="mr-comment-toolbar-group">
                            <button
                              className="mr-inline-tool-btn"
                              type="button"
                              onClick={() =>
                                setAllSelections(
                                  mr.id,
                                  allDisplayedSelected ? [] : displayedNotes.map((note) => note.id),
                                )
                              }
                            >
                              {allDisplayedSelected ? "Désélectionner" : "Tout sélectionner"}
                            </button>
                            <button
                              className="mr-inline-tool-btn"
                              type="button"
                              onClick={() => setAllSelections(mr.id, [])}
                            >
                              Effacer
                            </button>
                          </div>
                          <div className="mr-comment-toolbar-group">
                            <button
                              className="mr-inline-tool-btn"
                              disabled={selectedDisplayedNotes.length === 0}
                              type="button"
                              onClick={() => void copyPromptForNotes(mr, selectedDisplayedNotes, "selection")}
                            >
                              Copier sélection
                            </button>
                            <button
                              className="mr-inline-tool-btn"
                              type="button"
                              onClick={() => void copyPromptForNotes(mr, displayedNotes, "all")}
                            >
                              Copier tout
                            </button>
                          </div>
                        </div>
                        {copyFeedback && <p className="mr-copy-feedback">{copyFeedback}</p>}
                        {discussionThreads.map((thread) => {
                          const hasReplies = thread.replies.length > 0;
                          const isThreadOpen = expandedThreadIds.has(thread.discussionId);
                          const threadLabel =
                            thread.replies.length === 1
                              ? "1 réponse"
                              : `${thread.replies.length} réponses`;

                          return (
                            <div key={`${mr.id}-${thread.discussionId}-${thread.root.id}`} className="mr-thread">
                              <div className="mr-comment-item mr-comment-item--root">
                                <div className="mr-comment-head">
                                  <div className="mr-comment-author-wrap">
                                    <input
                                      checked={selectedIds.includes(thread.root.id)}
                                      className="mr-comment-check"
                                      type="checkbox"
                                      onChange={() => toggleNoteSelection(mr.id, thread.root.id)}
                                    />
                                    {showAvatars &&
                                      (thread.root.authorAvatarUrl ? (
                                        <img
                                          alt={thread.root.authorName}
                                          className="comment-avatar"
                                          src={thread.root.authorAvatarUrl}
                                        />
                                      ) : (
                                        <span className="comment-avatar comment-avatar-fallback">
                                          {initials(thread.root.authorName)}
                                        </span>
                                      ))}
                                    <span className="mr-comment-author">{thread.root.authorName}</span>
                                  </div>
                                  <div className="mr-comment-meta">
                                    {renderNoteStatus(thread.root)}
                                    <span className="linear-item-meta">
                                      {formatRelativeTime(thread.root.createdAt)}
                                    </span>
                                    <button
                                      className="mr-inline-link"
                                      type="button"
                                      onClick={() => onOpen(thread.root.webUrl)}
                                    >
                                      Open
                                    </button>
                                  </div>
                                </div>
                                {thread.root.reference && (
                                  <p className="mr-comment-ref">
                                    {formatDiscussionReferenceLabel(thread.root)}
                                  </p>
                                )}
                                <p className="mr-comment-body">{thread.root.body || "(sans contenu)"}</p>
                                {hasReplies && (
                                  <div className="mr-thread-toggle-row">
                                    <button
                                      className="mr-thread-toggle"
                                      type="button"
                                      onClick={() => toggleThread(mr.id, thread.discussionId)}
                                    >
                                      <span>{isThreadOpen ? `Masquer ${threadLabel}` : `Voir ${threadLabel}`}</span>
                                      <span className={`mr-thread-arrow ${isThreadOpen ? "is-open" : ""}`}>
                                        ▾
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {hasReplies && isThreadOpen && (
                                <div className="mr-thread-replies">
                                  {thread.replies.map((note) => (
                                    <div key={`${mr.id}-${note.id}`} className="mr-comment-item mr-comment-item--reply">
                                      <div className="mr-comment-head">
                                        <div className="mr-comment-author-wrap">
                                          <input
                                            checked={selectedIds.includes(note.id)}
                                            className="mr-comment-check"
                                            type="checkbox"
                                            onChange={() => toggleNoteSelection(mr.id, note.id)}
                                          />
                                          {showAvatars &&
                                            (note.authorAvatarUrl ? (
                                              <img
                                                alt={note.authorName}
                                                className="comment-avatar"
                                                src={note.authorAvatarUrl}
                                              />
                                            ) : (
                                              <span className="comment-avatar comment-avatar-fallback">
                                                {initials(note.authorName)}
                                              </span>
                                            ))}
                                          <span className="mr-comment-author">{note.authorName}</span>
                                        </div>
                                        <div className="mr-comment-meta">
                                          {renderNoteStatus(note)}
                                          <span className="linear-item-meta">
                                            {formatRelativeTime(note.createdAt)}
                                          </span>
                                          <button
                                            className="mr-inline-link"
                                            type="button"
                                            onClick={() => onOpen(note.webUrl)}
                                          >
                                            Open
                                          </button>
                                        </div>
                                      </div>
                                      {note.reference && (
                                        <p className="mr-comment-ref">{formatDiscussionReferenceLabel(note)}</p>
                                      )}
                                      <p className="mr-comment-body">{note.body || "(sans contenu)"}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
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
