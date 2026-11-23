import type {
  ChartRecord,
  ChartRequestPayload,
  ChartResponse,
  DataListResponse,
  DataSetDetail,
  UploadDataSetResponse,
} from "./types";

const API_BASE = "/api/data";

/** 上传 CSV / Excel 文件并解析为数据集 */
export async function uploadDataSet(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadDataSetResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText) as UploadDataSetResponse);
      } else {
        const err = (() => {
          try {
            return JSON.parse(xhr.responseText) as { error?: string };
          } catch {
            return { error: "上传失败" };
          }
        })();
        reject(new Error(err.error ?? `上传失败（${xhr.status}）`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("网络错误，上传失败"));
    });

    xhr.open("POST", `${API_BASE}/datasets`);
    xhr.send(form);
  });
}

/** 获取我的所有数据集列表 */
export async function listDataSets(): Promise<DataListResponse> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error("获取数据集列表失败");
  return res.json() as Promise<DataListResponse>;
}

/** 获取单条数据集详情 */
export async function getDataSet(id: string): Promise<{ dataset: DataSetDetail }> {
  const res = await fetch(`${API_BASE}/datasets/${id}`);
  if (!res.ok) throw new Error("获取数据集详情失败");
  return res.json() as Promise<{ dataset: DataSetDetail }>;
}

/** 删除数据集（级联删除关联图表） */
export async function deleteDataSet(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/datasets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("删除数据集失败");
  return res.json() as Promise<{ success: boolean }>;
}

/** 生成图表 */
export async function generateChart(
  datasetId: string,
  payload: ChartRequestPayload
): Promise<ChartResponse> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/chart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "生成图表失败");
  }
  return res.json() as Promise<ChartResponse>;
}

/** 获取数据集下所有图表 */
export async function listCharts(datasetId: string): Promise<{ charts: ChartRecord[] }> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/chart`);
  if (!res.ok) throw new Error("获取图表列表失败");
  return res.json() as Promise<{ charts: ChartRecord[] }>;
}

/** 删除图表 */
export async function deleteChart(chartId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/charts/${chartId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("删除图表失败");
  return res.json() as Promise<{ success: boolean }>;
}

/** 导出 Markdown 分析报告 */
export function exportMarkdown(
  dataset: DataSetDetail,
  charts: ChartRecord[]
): string {
  const date = new Date().toLocaleString("zh-CN");
  const sections = [
    `# 数据可视化分析报告\n`,
    `> 数据集：${dataset.name}\n> 导出时间：${date}\n> 数据行数：${dataset.rowCount}，列数：${dataset.columnCount}\n\n`,
    "## 字段说明\n",
    dataset.columns.map((col) => {
      const typeName: Record<string, string> = {
        number: "数值型",
        category: "分类型",
        date: "时间型",
        text: "文本型",
      };
      const stat =
        col.type === "number"
          ? `取值范围：${col.min ?? "-"} ~ ${col.max ?? "-"}，均值：${col.mean ?? "-"}`
          : col.type === "date"
            ? `时间范围：${col.first?.slice(0, 10) ?? "-"} ~ ${col.last?.slice(0, 10) ?? "-"}`
            : col.samples.length > 0
              ? `高频取值：${col.samples.slice(0, 3).join("、")}`
              : "";
      return `- **${col.name}** (${typeName[col.type]})：缺失值 ${col.missing} 个，唯一值 ${col.unique} 个${stat ? `；${stat}` : ""}。`;
    }).join("\n"),
    "\n\n## 图表与解读\n",
  ];
  for (const chart of charts) {
    sections.push(
      `### ${chart.title}\n\n`,
      `${chart.insight || "无解读"}\n\n`,
      `\`\`\`json\n${JSON.stringify(chart.option, null, 2)}\n\`\`\`\n\n`,
    );
  }
  sections.push("\n---\n*报告由融研AI自动生成*");
  return sections.join("");
}

/** 下载文件辅助函数 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
