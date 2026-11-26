// 实验台账AI服务，暂时占位，后续完善
export interface ExperimentLog {
  id: string;
  experimentId: string;
  content: string;
  createdAt: Date;
  // 其他字段后续补充
}

export async function generateExperimentSummary(userId: string, log: ExperimentLog) {
  return "这是AI生成的实验总结（占位）";
}

export async function generateWeeklyReport(userId: string, logs: ExperimentLog[]) {
  return "这是AI生成的周报（占位）";
}
