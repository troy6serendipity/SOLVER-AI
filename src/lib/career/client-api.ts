import type {
  JobApplication,
  ResumeOptimizeRequest,
  ResumeOptimizeResponse,
  JobMatchRequest,
  JobMatchResult,
  InterviewStartRequest,
  InterviewReplyRequest,
  InterviewMessage,
  InterviewReview,
  JobStatus,
} from "./types";

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? `请求失败（HTTP ${response.status}）`;
  } catch {
    return `请求失败（HTTP ${response.status}）`;
  }
}

/** 简历优化 */
export async function optimizeResume(data: ResumeOptimizeRequest): Promise<ResumeOptimizeResponse> {
  const response = await fetch("/api/career/resume/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as ResumeOptimizeResponse;
}

/** 岗位匹配 */
export async function matchJobs(data: JobMatchRequest): Promise<JobMatchResult[]> {
  const response = await fetch("/api/career/jobs/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const res = (await response.json()) as { matches: JobMatchResult[] };
  return res.matches;
}

/** 开始模拟面试 */
export async function startInterview(data: InterviewStartRequest): Promise<InterviewMessage> {
  const response = await fetch("/api/career/interview/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const res = (await response.json()) as { message: InterviewMessage };
  return res.message;
}

/** 回复面试问题 */
export async function replyInterview(data: InterviewReplyRequest): Promise<InterviewMessage> {
  const response = await fetch("/api/career/interview/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const res = (await response.json()) as { message: InterviewMessage };
  return res.message;
}

/** 结束面试并生成点评 */
export async function endInterview(history: InterviewMessage[]): Promise<InterviewReview> {
  const response = await fetch("/api/career/interview/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const res = (await response.json()) as { review: InterviewReview };
  return res.review;
}

/** 获取求职申请列表 */
export async function listJobApplications(): Promise<JobApplication[]> {
  const response = await fetch("/api/career/applications", { cache: "no-store" });
  if (!response.ok) throw new Error(await parseError(response));
  const res = (await response.json()) as { records: JobApplication[] };
  return res.records;
}

/** 创建求职申请 */
export async function createJobApplication(data: {
  company: string;
  position: string;
  status: JobStatus;
  interviewTime?: string;
  salary?: string;
  notes?: string;
}): Promise<JobApplication> {
  const response = await fetch("/api/career/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const res = (await response.json()) as { application: JobApplication };
  return res.application;
}

/** 更新求职申请 */
export async function updateJobApplication(
  id: string,
  data: Partial<{
    company: string;
    position: string;
    status: JobStatus;
    interviewTime: string | null;
    salary: string | null;
    notes: string | null;
  }>
): Promise<JobApplication> {
  const response = await fetch(`/api/career/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const res = (await response.json()) as { application: JobApplication };
  return res.application;
}

/** 删除求职申请 */
export async function deleteJobApplication(id: string): Promise<void> {
  const response = await fetch(`/api/career/applications/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await parseError(response));
}
