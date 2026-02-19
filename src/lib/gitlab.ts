import {
  COMMENT_LIMIT,
  DEFAULT_CONCURRENCY,
  type GitLabUser,
  type MergeRequestApprover,
  type MergeRequestItem,
  type MergeRequestDiscussionNote,
  type MergeRequestCiStatus,
  type MergeRequestCiJob,
  MR_LIMIT,
  NOTES_PER_MR_LIMIT,
  REQUEST_TIMEOUT_MS,
  type Settings,
  type CommentItem,
  type TicketItem,
} from "./types";

interface RawMergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  web_url: string;
  state: string;
  updated_at: string;
  author?: { name?: string };
}

interface RawApprovalUser {
  id?: number;
  name?: string;
  avatar_url?: string | null;
}

interface RawMergeRequestApprovals {
  approved?: boolean;
  approved_by?: Array<{ user?: RawApprovalUser } | RawApprovalUser>;
}

interface RawNote {
  id: number;
  body: string;
  system: boolean;
  created_at: string;
  author?: { id?: number; name?: string; avatar_url?: string | null };
}

interface RawIssue {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  web_url: string;
  state: string;
  updated_at: string;
  labels: string[];
  author?: { name?: string };
}

interface RawDiscussionNote {
  id: number;
  body: string;
  system: boolean;
  created_at: string;
  resolvable?: boolean;
  resolved?: boolean;
  author?: { name?: string; avatar_url?: string | null };
}

interface RawDiscussion {
  notes: RawDiscussionNote[];
}

interface RawMrPipeline {
  id: number;
  status: string;
  web_url?: string;
}

interface RawPipelineJob {
  id: number;
  name: string;
  stage: string;
  status: string;
  web_url: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function createHeaders(token: string): HeadersInit {
  return {
    "PRIVATE-TOKEN": token,
    "Content-Type": "application/json",
  };
}

async function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function buildGitLabError(response: Response, context: string): Error {
  if (response.status === 401) {
    return new Error(`${context}: token invalide (401)`);
  }

  return new Error(`${context}: erreur ${response.status}`);
}

async function fetchJson<T>(url: string, token: string, context: string): Promise<T> {
  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    throw buildGitLabError(response, context);
  }

  return (await response.json()) as T;
}

async function post(url: string, token: string, context: string): Promise<void> {
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    throw buildGitLabError(response, context);
  }
}

export async function testGitLabConnection(settings: Settings): Promise<GitLabUser> {
  const baseUrl = normalizeBaseUrl(settings.gitlabBaseUrl);
  const token = settings.personalAccessToken.trim();

  if (!baseUrl || !token) {
    throw new Error("Base URL et token requis");
  }

  return fetchJson<GitLabUser>(`${baseUrl}/api/v4/user`, token, "Test connexion");
}

export async function fetchCurrentUser(settings: Settings): Promise<GitLabUser> {
  return testGitLabConnection(settings);
}

async function fetchMergeRequestsByScope(settings: Settings, scope: string): Promise<MergeRequestItem[]> {
  const baseUrl = normalizeBaseUrl(settings.gitlabBaseUrl);
  const token = settings.personalAccessToken.trim();
  const search = new URLSearchParams({
    scope,
    state: "opened",
    per_page: String(MR_LIMIT),
    order_by: "updated_at",
    sort: "desc",
  });

  const url = `${baseUrl}/api/v4/merge_requests?${search.toString()}`;
  const mrs = await fetchJson<RawMergeRequest[]>(url, token, `Liste MRs (${scope})`);

  return mrs.map((mr) => ({
    id: mr.id,
    iid: mr.iid,
    projectId: mr.project_id,
    title: mr.title,
    webUrl: mr.web_url,
    authorName: mr.author?.name ?? "Unknown",
    updatedAt: mr.updated_at,
    state: mr.state,
    approved: false,
    approvedBy: [],
  }));
}

function parseApprovedByList(rawApprovals: RawMergeRequestApprovals): MergeRequestApprover[] {
  const items = rawApprovals.approved_by ?? [];
  const approvers: MergeRequestApprover[] = [];

  for (const item of items) {
    const wrapped = item as { user?: RawApprovalUser };
    const user = wrapped.user ?? (item as RawApprovalUser);
    const id = Number(user?.id);

    if (!Number.isInteger(id) || id <= 0) {
      continue;
    }

    approvers.push({
      id,
      name: user?.name?.trim() || "Unknown",
      avatarUrl: user?.avatar_url ?? null,
    });
  }

  return approvers;
}

async function fetchMergeRequestApprovals(
  settings: Settings,
  mr: MergeRequestItem,
): Promise<Pick<MergeRequestItem, "approved" | "approvedBy">> {
  const baseUrl = normalizeBaseUrl(settings.gitlabBaseUrl);
  const token = settings.personalAccessToken.trim();
  const url = `${baseUrl}/api/v4/projects/${mr.projectId}/merge_requests/${mr.iid}/approvals`;
  const response = await fetchJson<RawMergeRequestApprovals>(url, token, `Approvals MR !${mr.iid}`);
  const approvedBy = parseApprovedByList(response);
  const approved = typeof response.approved === "boolean" ? response.approved : approvedBy.length > 0;

  return {
    approved,
    approvedBy,
  };
}

export async function fetchTrackedMergeRequests(settings: Settings): Promise<MergeRequestItem[]> {
  const [assigned, reviews] = await Promise.all([
    fetchMergeRequestsByScope(settings, "assigned_to_me"),
    fetchMergeRequestsByScope(settings, "reviews_for_me"),
  ]);

  const byId = new Map<number, MergeRequestItem>();
  for (const mr of [...assigned, ...reviews]) {
    byId.set(mr.id, mr);
  }

  const trackedMrs = [...byId.values()]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, MR_LIMIT);

  const approvals = await Promise.all(
    trackedMrs.map(async (mr) => {
      try {
        return await fetchMergeRequestApprovals(settings, mr);
      } catch {
        return { approved: false, approvedBy: [] };
      }
    }),
  );

  return trackedMrs.map((mr, index) => ({
    ...mr,
    approved: approvals[index].approved,
    approvedBy: approvals[index].approvedBy,
  }));
}

async function fetchNotesForMr(settings: Settings, mr: MergeRequestItem): Promise<CommentItem[]> {
  const baseUrl = normalizeBaseUrl(settings.gitlabBaseUrl);
  const token = settings.personalAccessToken.trim();
  const search = new URLSearchParams({
    per_page: String(NOTES_PER_MR_LIMIT),
    sort: "desc",
  });

  const url = `${baseUrl}/api/v4/projects/${mr.projectId}/merge_requests/${mr.iid}/notes?${search.toString()}`;
  const notes = await fetchJson<RawNote[]>(url, token, `Notes MR !${mr.iid}`);

  return notes
    .filter((note) => !note.system)
    .map((note) => ({
      id: note.id,
      projectId: mr.projectId,
      mrIid: mr.iid,
      body: note.body.trim(),
      authorName: note.author?.name ?? "Unknown",
      authorAvatarUrl: note.author?.avatar_url ?? null,
      authorId: note.author?.id ?? -1,
      createdAt: note.created_at,
      webUrl: `${mr.webUrl}#note_${note.id}`,
      key: `${mr.projectId}:${mr.iid}:${note.id}`,
    }));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        return;
      }

      const value = await mapper(next);
      results.push(value);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function fetchRecentComments(
  settings: Settings,
  mrs: MergeRequestItem[],
): Promise<CommentItem[]> {
  if (mrs.length === 0) {
    return [];
  }

  const chunks = await mapWithConcurrency(mrs, DEFAULT_CONCURRENCY, (mr) =>
    fetchNotesForMr(settings, mr),
  );

  const byKey = new Map<string, CommentItem>();
  for (const notes of chunks) {
    for (const note of notes) {
      byKey.set(note.key, note);
    }
  }

  return [...byKey.values()]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, COMMENT_LIMIT);
}

export async function fetchAssignedTickets(settings: Settings): Promise<TicketItem[]> {
  const baseUrl = normalizeBaseUrl(settings.gitlabBaseUrl);
  const token = settings.personalAccessToken.trim();
  const search = new URLSearchParams({
    scope: "assigned_to_me",
    state: "opened",
    per_page: String(MR_LIMIT),
    order_by: "updated_at",
    sort: "desc",
  });

  const url = `${baseUrl}/api/v4/issues?${search.toString()}`;
  const issues = await fetchJson<RawIssue[]>(url, token, "Liste tickets assignés");

  return issues.map((issue) => ({
    id: issue.id,
    iid: issue.iid,
    projectId: issue.project_id,
    title: issue.title,
    webUrl: issue.web_url,
    state: issue.state,
    authorName: issue.author?.name ?? "Unknown",
    updatedAt: issue.updated_at,
    labels: issue.labels ?? [],
  }));
}

export async function fetchMergeRequestDiscussionNotes(
  settings: Settings,
  mr: MergeRequestItem,
): Promise<MergeRequestDiscussionNote[]> {
  const baseUrl = normalizeBaseUrl(settings.gitlabBaseUrl);
  const token = settings.personalAccessToken.trim();
  const search = new URLSearchParams({
    per_page: "50",
    sort: "desc",
  });

  const url = `${baseUrl}/api/v4/projects/${mr.projectId}/merge_requests/${mr.iid}/discussions?${search.toString()}`;
  const discussions = await fetchJson<RawDiscussion[]>(url, token, `Discussions MR !${mr.iid}`);

  const notes: MergeRequestDiscussionNote[] = [];
  for (const discussion of discussions) {
    for (const note of discussion.notes ?? []) {
      if (note.system) {
        continue;
      }

      notes.push({
        id: note.id,
        mrIid: mr.iid,
        projectId: mr.projectId,
        body: note.body?.trim() ?? "",
        authorName: note.author?.name ?? "Unknown",
        authorAvatarUrl: note.author?.avatar_url ?? null,
        createdAt: note.created_at,
        resolvable: note.resolvable ?? false,
        resolved: note.resolved ?? false,
        webUrl: `${mr.webUrl}#note_${note.id}`,
      });
    }
  }

  return notes.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function groupJobsByStage(jobs: MergeRequestCiJob[]) {
  const stageMap = new Map<string, MergeRequestCiJob[]>();
  for (const job of jobs) {
    const current = stageMap.get(job.stage) ?? [];
    current.push(job);
    stageMap.set(job.stage, current);
  }

  return [...stageMap.entries()]
    .map(([name, stageJobs]) => ({
      name,
      jobs: stageJobs.sort((a, b) => a.id - b.id),
    }))
    .reverse();
}

export async function fetchMergeRequestCiStatus(
  settings: Settings,
  mr: MergeRequestItem,
): Promise<MergeRequestCiStatus> {
  const baseUrl = normalizeBaseUrl(settings.gitlabBaseUrl);
  const token = settings.personalAccessToken.trim();
  const pipelineSearch = new URLSearchParams({ per_page: "1" });
  const pipelineUrl = `${baseUrl}/api/v4/projects/${mr.projectId}/merge_requests/${mr.iid}/pipelines?${pipelineSearch.toString()}`;
  const pipelines = await fetchJson<RawMrPipeline[]>(pipelineUrl, token, `CI MR !${mr.iid}`);
  const latest = pipelines[0];

  if (!latest) {
    return {
      pipelineId: null,
      status: "none",
      webUrl: null,
      stages: [],
    };
  }

  const jobsSearch = new URLSearchParams({ per_page: "100" });
  const jobsUrl = `${baseUrl}/api/v4/projects/${mr.projectId}/pipelines/${latest.id}/jobs?${jobsSearch.toString()}`;
  const rawJobs = await fetchJson<RawPipelineJob[]>(jobsUrl, token, `Jobs CI pipeline ${latest.id}`);

  const jobs: MergeRequestCiJob[] = rawJobs.map((job) => ({
    id: job.id,
    name: job.name,
    stage: job.stage,
    status: job.status,
    webUrl: job.web_url,
  }));

  return {
    pipelineId: latest.id,
    status: latest.status,
    webUrl: latest.web_url ?? null,
    stages: groupJobsByStage(jobs),
  };
}

export async function playCiJob(settings: Settings, projectId: number, jobId: number): Promise<void> {
  const baseUrl = normalizeBaseUrl(settings.gitlabBaseUrl);
  const token = settings.personalAccessToken.trim();
  const url = `${baseUrl}/api/v4/projects/${projectId}/jobs/${jobId}/play`;
  await post(url, token, `Play job ${jobId}`);
}
