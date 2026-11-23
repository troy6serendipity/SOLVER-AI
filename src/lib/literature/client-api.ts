import type {
  AskPayload,
  PaperDetail,
  PaperListResponse,
  SummaryCards,
  TranslatePayload,
} from "./types";

// 文献阅读助手客户端 API 封装（仅浏览器侧使用）

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; warning?: string };
    return data.error ?? `请求失败（HTTP ${response.status}）`;
  } catch {
    return `请求失败（HTTP ${response.status}）`;
  }
}

export interface UploadResult {
  paper: PaperDetail;
  paragraphCount: number;
  warning?: string;
}

/** 上传 PDF（multipart），后端解析、切分段落并自动生成速读卡 */
export async function uploadPaper(
  file: File,
  tags: string[],
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  if (tags.length > 0) form.append("tags", JSON.stringify(tags));

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/papers");
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as UploadResult);
      } else {
        const message =
          (xhr.response as { error?: string })?.error ??
          `上传失败（HTTP ${xhr.status}）`;
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("网络错误，上传中断"));
    xhr.send(form);
  });
}

/** 文献库列表：关键词 / 收藏 / 标签筛选 */
export async function listPapers(options?: {
  keyword?: string;
  favorite?: boolean;
  tag?: string;
}): Promise<PaperListResponse> {
  const params = new URLSearchParams();
  if (options?.keyword) params.set("keyword", options.keyword);
  if (options?.favorite) params.set("favorite", "true");
  if (options?.tag) params.set("tag", options.tag);
  const query = params.toString();
  const response = await fetch(
    `/api/papers${query ? `?${query}` : ""}`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as PaperListResponse;
}

/** 文献详情（含段落与速读卡） */
export async function getPaper(id: string): Promise<PaperDetail> {
  const response = await fetch(`/api/papers/${id}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { paper: PaperDetail };
  return data.paper;
}

/** 更新标签 / 收藏 / 标题 */
export async function updatePaper(
  id: string,
  patch: { tags?: string[]; favorite?: boolean; title?: string }
): Promise<void> {
  const response = await fetch(`/api/papers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(await parseError(response));
}

/** 删除文献 */
export async function deletePaper(id: string): Promise<void> {
  const response = await fetch(`/api/papers/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await parseError(response));
}

/** （重新）生成速读卡 */
export async function regenerateSummary(id: string): Promise<SummaryCards> {
  const response = await fetch(`/api/papers/${id}/summary`, { method: "POST" });
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { summary: SummaryCards };
  return data.summary;
}

/** 速读卡翻译 */
export async function translateCards(
  id: string,
  target: "zh" | "en"
): Promise<{ text: string; cached: boolean }> {
  const body: TranslatePayload = { target };
  const response = await fetch(`/api/papers/${id}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as { text: string; cached: boolean };
}

export interface AskStreamOptions {
  paperId: string;
  question: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
}

/** 溯源问答：消费 SSE 流，累积 text-delta，返回完整回答文本 */
export async function streamPaperAsk(
  options: AskStreamOptions
): Promise<string> {
  const { paperId, question, history, signal, onDelta } = options;
  const payload: AskPayload = { question, history };
  const response = await fetch(`/api/papers/${paperId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(await parseError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separator: number;
    while ((separator = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      for (const line of rawEvent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payloadText = trimmed.slice(5).trim();
        if (!payloadText || payloadText === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payloadText) as {
            type?: string;
            delta?: string;
          };
          if (chunk.type === "text-delta" && typeof chunk.delta === "string") {
            fullText += chunk.delta;
            onDelta(chunk.delta);
          }
        } catch {
          // 忽略控制帧
        }
      }
    }
  }

  return fullText;
}
