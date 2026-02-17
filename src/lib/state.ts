import type { CommentItem } from "./types";

function toMs(date: string | null): number {
  if (!date) {
    return 0;
  }

  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function computeUnreadCount(comments: CommentItem[], lastSeenCommentAt: string | null): number {
  const lastSeenMs = toMs(lastSeenCommentAt);

  return comments.reduce((count, item) => {
    return toMs(item.createdAt) > lastSeenMs ? count + 1 : count;
  }, 0);
}

export function getLatestCommentTimestamp(comments: CommentItem[]): string | null {
  if (comments.length === 0) {
    return null;
  }

  let latest = comments[0].createdAt;
  for (const comment of comments.slice(1)) {
    if (toMs(comment.createdAt) > toMs(latest)) {
      latest = comment.createdAt;
    }
  }

  return latest;
}

export function getNewCommentsSince(comments: CommentItem[], since: string | null): CommentItem[] {
  const sinceMs = toMs(since);
  return comments.filter((item) => toMs(item.createdAt) > sinceMs);
}
