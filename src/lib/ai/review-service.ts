import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { getChatModel, type ModelTier, type ScenarioKey } from "./models";

// 复习助手的非流式 AI 能力封装：变式题生成、知识点/公式抽取。
// 统一走 getChatModel 分档工厂，并把 Token 用量写入 AiUsageLog。

export interface ReviewGenerateParams {
  userId: string;
  scenario: ScenarioKey;
  tier: ModelTier;
  system: string;
  prompt: string;
  temperature?: number;
}

export interface ReviewGenerateResult {
  text: string;
  modelId: string;
  provider: string;
  mock: boolean;
}

/** 调用 generateText 并记录用量；用量落库失败不影响主链路 */
export async function runReviewGenerate(
  params: ReviewGenerateParams
): Promise<ReviewGenerateResult> {
  const { userId, scenario, tier, system, prompt, temperature } = params;
  const { model, modelId, provider, mock } = await getChatModel(tier);

  const result = await generateText({
    model,
    system,
    prompt,
    ...(temperature === undefined ? {} : { temperature }),
  });

  try {
    const inputTokens = result.usage.inputTokens ?? 0;
    const outputTokens = result.usage.outputTokens ?? 0;
    await prisma.aiUsageLog.create({
      data: {
        userId,
        tier,
        scenario,
        provider,
        model: modelId,
        inputTokens,
        outputTokens,
        totalTokens: result.usage.totalTokens ?? inputTokens + outputTokens,
        mock,
      },
    });
  } catch (error) {
    console.error("[review] 写入 AiUsageLog 失败:", error);
  }

  return { text: result.text, modelId, provider, mock };
}

/**
 * 从模型输出中防御性提取 JSON 对象。
 * 兼容 ```json 代码块包裹、前后多余说明文字等情况；失败返回 null。
 */
export function extractJson<T>(raw: string): T | null {
  if (!raw) return null;
  // 优先尝试直接解析
  try {
    return JSON.parse(raw) as T;
  } catch {
    // 继续向下兼容
  }
  // 提取代码块中的 JSON
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** 清洗 AI 抽取的字符串数组：去空白、去重、限量 */
export function sanitizeTagList(
  value: unknown,
  limit = 6
): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
}
