export type PollIntervalMinutes = 1 | 2 | 3 | 5;
export type ThemeMode = "light" | "dark";
export type ThemePreset = "claude" | "light-green";

export const THEME_PRESET_OPTIONS: ThemePreset[] = [
  "claude",
  "light-green",
];

export interface Settings {
  gitlabBaseUrl: string;
  personalAccessToken: string;
  pollIntervalMinutes: PollIntervalMinutes;
  theme: ThemeMode;
  themePreset: ThemePreset;
  mutedMrIids: number[];
  showCommentAvatars: boolean;
  cycleStartLabel: string;
  cycleEndLabel: string;
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
  approved: boolean;
  approvedBy: MergeRequestApprover[];
}

export interface MergeRequestApprover {
  id: number;
  name: string;
  avatarUrl: string | null;
}

export interface TicketTimeStats {
  timeEstimateSeconds: number;
  totalTimeSpentSeconds: number;
  humanTimeEstimate: string;
  humanTotalTimeSpent: string;
}

export interface MergeRequestDiscussionNote {
  id: number;
  discussionId: string;
  threadRootNoteId: number;
  isThreadRoot: boolean;
  mrIid: number;
  projectId: number;
  body: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  resolved: boolean;
  resolvable: boolean;
  webUrl: string;
  reference: MergeRequestDiscussionReference | null;
}

export interface MergeRequestDiscussionReference {
  filePath: string | null;
  oldPath: string | null;
  newPath: string | null;
  line: number | null;
  oldLine: number | null;
  newLine: number | null;
  lineRangeStart: number | null;
  lineRangeEnd: number | null;
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
  authorAvatarUrl: string | null;
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
  timeEstimateSeconds: number;
  totalTimeSpentSeconds: number;
  humanTimeEstimate: string;
  humanTotalTimeSpent: string;
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
  themePreset: "claude",
  mutedMrIids: [],
  showCommentAvatars: true,
  cycleStartLabel: "",
  cycleEndLabel: "",
};

export const MR_LIMIT = 20;
export const COMMENT_LIMIT = 20;
export const NOTES_PER_MR_LIMIT = 20;
export const REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_CONCURRENCY = 4;
