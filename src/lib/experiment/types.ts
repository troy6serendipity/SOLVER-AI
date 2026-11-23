// 实验台账类型定义

export interface ExperimentLogDetail {
  id: string;
  title: string;
  purpose: string | null;
  procedure: string | null;
  parameters: Record<string, string> | null;
  observations: string | null;
  conclusion: string | null;
  aiSummary: string | null;
  experimentDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentLogListItem {
  id: string;
  title: string;
  experimentDate: string | null;
  createdAt: string;
  hasAiSummary: boolean;
}

export interface AiExperimentSummaryRequest {
  title: string;
  purpose?: string;
  procedure?: string;
  parameters?: Record<string, string>;
  observations?: string;
  conclusion?: string;
}

export interface AiExperimentSummaryResponse {
  summary: string;
  highlights: string[];
  anomalies: string[];
}

export interface WeeklyReportRequest {
  startDate: string;
  endDate: string;
  experiments: ExperimentLogDetail[];
}

export interface WeeklyReportResponse {
  progress: string[];
  problems: string[];
  plans: string[];
  markdown: string;
}
