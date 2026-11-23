// 实验台账客户端 API 封装
import type {
  ExperimentLogDetail,
  ExperimentLogListItem,
  AiExperimentSummaryResponse,
  WeeklyReportResponse,
} from "./types";

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? `请求失败（HTTP ${response.status}）`;
  } catch {
    return `请求失败（HTTP ${response.status}）`;
  }
}

/** 获取实验记录列表 */
export async function listExperiments(options?: {
  keyword?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ExperimentLogListItem[]> {
  const params = new URLSearchParams();
  if (options?.keyword) params.set("keyword", options.keyword);
  if (options?.startDate) params.set("startDate", options.startDate);
  if (options?.endDate) params.set("endDate", options.endDate);
  const query = params.toString();
  const response = await fetch(
    `/api/experiments${query ? `?${query}` : ""}`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { records: ExperimentLogListItem[] };
  return data.records;
}

/** 获取单条实验记录详情 */
export async function getExperiment(id: string): Promise<ExperimentLogDetail> {
  const response = await fetch(`/api/experiments/${id}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { log: ExperimentLogDetail };
  return data.log;
}

/** 创建新实验记录 */
export async function createExperiment(data: {
  title: string;
  purpose?: string;
  procedure?: string;
  parameters?: Record<string, string>;
  observations?: string;
  conclusion?: string;
  experimentDate?: string;
}): Promise<ExperimentLogDetail> {
  const response = await fetch("/api/experiments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const res = (await response.json()) as { log: ExperimentLogDetail };
  return res.log;
}

/** 更新实验记录 */
export async function updateExperiment(
  id: string,
  data: Partial<{
    title: string;
    purpose: string | null;
    procedure: string | null;
    parameters: Record<string, string> | null;
    observations: string | null;
    conclusion: string | null;
    experimentDate: string | null;
  }>
): Promise<ExperimentLogDetail> {
  const response = await fetch(`/api/experiments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const res = (await response.json()) as { log: ExperimentLogDetail };
  return res.log;
}

/** 删除实验记录 */
export async function deleteExperiment(id: string): Promise<void> {
  const response = await fetch(`/api/experiments/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await parseError(response));
}

/** AI 归纳实验记录 */
export async function summarizeExperiment(id: string): Promise<AiExperimentSummaryResponse> {
  const response = await fetch(`/api/experiments/${id}/summarize`, { method: "POST" });
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { summary: AiExperimentSummaryResponse };
  return data.summary;
}

/** 生成组会周报 */
export async function generateReport(data: {
  startDate: string;
  endDate: string;
}): Promise<WeeklyReportResponse> {
  const response = await fetch("/api/experiments/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const res = (await response.json()) as { report: WeeklyReportResponse };
  return res.report;
}
