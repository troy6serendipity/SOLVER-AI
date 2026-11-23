import type {
  ChatMessage,
  SaveWrongPayload,
  SaveWrongResponse,
  VariantResponse,
  WrongQuestionListResponse,
} from "./types";

// 复习助手客户端 API 封装（仅在浏览器侧使用）

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return data.message ?? data.error ?? `请求失败（HTTP ${response.status}）`;
  } catch {
    return `请求失败（HTTP ${response.status}）`;
  }
}

/** 调用 OCR 预留接口；当前后端返回 501 时由调用方引导手动输入 */
export async function recognizeImage(
  image: string
): Promise<{ text: string } | { unavailable: true; message: string }> {
  const response = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  if (response.ok) {
    return (await response.json()) as { text: string };
  }
  const message = await parseError(response);
  return { unavailable: true, message };
}

/** 生成同类变式题 */
export async function generateVariant(
  question: string
): Promise<VariantResponse> {
  const response = await fetch("/api/review/variant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as VariantResponse;
}

/** 收入错题本（服务端 AI 抽取标签与公式） */
export async function saveWrongQuestion(
  payload: SaveWrongPayload
): Promise<SaveWrongResponse> {
  const response = await fetch("/api/review/save-wrong", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as SaveWrongResponse;
}

/** 获取错题本列表（可选标签 / 掌握度筛选） */
export async function listWrongQuestions(options?: {
  knowledgePoint?: string;
  mastery?: string;
}): Promise<WrongQuestionListResponse> {
  const params = new URLSearchParams();
  if (options?.knowledgePoint) {
    params.set("knowledgePoint", options.knowledgePoint);
  }
  if (options?.mastery) {
    params.set("mastery", options.mastery);
  }
  const query = params.toString();
  const response = await fetch(
    `/api/review/wrong-questions${query ? `?${query}` : ""}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as WrongQuestionListResponse;
}

/** 更新掌握度标记 */
export async function updateMastery(
  id: string,
  mastery: string
): Promise<void> {
  const response = await fetch(`/api/review/wrong-questions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mastery }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

/** 删除错题 */
export async function deleteWrongQuestion(id: string): Promise<void> {
  const response = await fetch(`/api/review/wrong-questions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export interface StreamChatOptions {
  messages: ChatMessage[];
  system: string;
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
}

/**
 * 消费 /api/chat 的 UI Message Stream（SSE）。
 * 手动解析 data: 帧，只累积 text-delta，返回完整助手文本。
 */
export async function streamReviewChat(
  options: StreamChatOptions
): Promise<string> {
  const { messages, system, signal, onDelta } = options;
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: "review", system, messages }),
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

    // SSE 事件以空行分隔
    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      for (const line of rawEvent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as { type?: string; delta?: string };
          if (chunk.type === "text-delta" && typeof chunk.delta === "string") {
            fullText += chunk.delta;
            onDelta(chunk.delta);
          }
        } catch {
          // 忽略无法解析的心跳/控制帧
        }
      }
    }
  }

  return fullText;
}
