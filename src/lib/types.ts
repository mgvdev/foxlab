export type PollIntervalMinutes = 1 | 2 | 3 | 5;
export type ThemeMode = "light" | "dark";

export interface Settings {
  gitlabBaseUrl: string;
  personalAccessToken: string;
  pollIntervalMinutes: PollIntervalMinutes;
  theme: ThemeMode;
  mutedMrIids: number[];
}

export interface MergeRequestItem {
  id: number;
  iid: number;
  projectId: number;
  title: string;
  webUrl: string;
  authorName: string;
  updatedAt: string;
  state: "opened" | string;
}

export interface MergeRequestDiscussionNote {
  id: number;
  mrIid: number;
  projectId: number;
  body: string;
  authorName: string;
  createdAt: string;
  resolved: boolean;
  resolvable: boolean;
  webUrl: string;
}

export interface MergeRequestCiJob {
  id: number;
  name: string;
  stage: string;
  status: string;
  webUrl: string;
}

export interface MergeRequestCiStage {
  name: string;
  jobs: MergeRequestCiJob[];
}

export interface MergeRequestCiStatus {
  pipelineId: number | null;
  status: string;
  webUrl: string | null;
  stages: MergeRequestCiStage[];
}

export interface CommentItem {
  id: number;
  projectId: number;
  mrIid: number;
  body: string;
  authorName: string;
  authorId: number;
  createdAt: string;
  webUrl: string;
  key: string;
}

export interface AppSnapshot {
  mrs: MergeRequestItem[];
  comments: CommentItem[];
  tickets: TicketItem[];
  unreadCount: number;
  lastSyncAt: string | null;
  error: string | null;
}

export interface TicketItem {
  id: number;
  iid: number;
  projectId: number;
  title: string;
  webUrl: string;
  state: string;
  authorName: string;
  updatedAt: string;
  labels: string[];
}

export interface GitLabUser {
  id: number;
  name: string;
  username: string;
}

export const DEFAULT_SETTINGS: Settings = {
  gitlabBaseUrl: "https://gitlab.com",
  personalAccessToken: "",
  pollIntervalMinutes: 2,
  theme: "light",
  mutedMrIids: [],
};

export const MR_LIMIT = 20;
export const COMMENT_LIMIT = 20;
export const NOTES_PER_MR_LIMIT = 20;
export const REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_CONCURRENCY = 4;
