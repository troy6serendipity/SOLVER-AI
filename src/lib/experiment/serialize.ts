import type { ExperimentLog } from "@prisma/client";
import type { ExperimentLogDetail, ExperimentLogListItem } from "./types";

export function toExperimentLogDetail(log: ExperimentLog): ExperimentLogDetail {
  return {
    id: log.id,
    title: log.title,
    purpose: log.purpose,
    procedure: log.procedure,
    parameters: log.parameters ? JSON.parse(log.parameters) : null,
    observations: log.observations,
    conclusion: log.conclusion,
    aiSummary: log.aiSummary,
    experimentDate: log.experimentDate ? log.experimentDate.toISOString().split("T")[0] : null,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}

export function toExperimentLogListItem(log: ExperimentLog): ExperimentLogListItem {
  return {
    id: log.id,
    title: log.title,
    experimentDate: log.experimentDate ? log.experimentDate.toISOString().split("T")[0] : null,
    createdAt: log.createdAt.toISOString(),
    hasAiSummary: !!log.aiSummary,
  };
}
