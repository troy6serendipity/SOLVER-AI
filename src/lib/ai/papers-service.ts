import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { getChatModel } from "./models";
import { extractJson, sanitizeTagList } from "./review-service";
import type { SummaryCards } from "@/lib/literature/types";

// 文献助手的非流式 AI 能力：三分钟速读卡、摘要中英翻译。
// 统一走轻量模型（SCENARIOS.papers.tier = light），并记录 Token 用量。

const MAX_CONTEXT_CHARS = 12000;

async function runPapersGenerate(params: {
  userId: string;
  system: string;
  prompt: string;
  temperature?: number;
}) {
  const { userId, system, prompt, temperature } = params;
  const { model, modelId, provider, mock } = await getChatModel("light");

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
        tier: "light",
        scenario: "papers",
        provider,
        model: modelId,
        inputTokens,
        outputTokens,
        totalTokens: result.usage.totalTokens ?? inputTokens + outputTokens,
        mock,
      },
    });
  } catch (error) {
    console.error("[papers] 写入 AiUsageLog 失败:", error);
  }

  return { text: result.text, mock };
}

const SUMMARY_SYSTEM = [
  "你是融研AI的文献速读专家。根据用户给出的论文全文（或节选），只输出一个 JSON 对象，不要输出任何解释或 markdown 代码块。",
  "JSON 字段固定为：",
  '{"background":"研究背景：1-2 句说明问题与动机",',
  '"methods":"核心方法：1-2 句概括关键技术路线",',
  '"results":"实验结果：1-2 句给出主要数据与结论",',
  '"limitations":"局限性：1-2 句指出不足或未来工作"}',
  "每个字段用中文填写，内容精炼，总计不超过 200 字，无法从原文判断时明确写「原文未明确说明」。",
].join("\n");

/** 生成三分钟速读卡；失败返回 null，由调用方决定降级策略 */
export async function generatePaperSummary(
  userId: string,
  title: string,
  fullText: string
): Promise<SummaryCards | null> {
  const excerpt = fullText.slice(0, MAX_CONTEXT_CHARS);
  const { text } = await runPapersGenerate({
    userId,
    system: SUMMARY_SYSTEM,
    prompt: `论文标题：${title}\n\n论文正文：\n${excerpt}`,
    temperature: 0.3,
  });

  const parsed = extractJson<Partial<SummaryCards>>(text);
  if (!parsed) return null;

  return {
    background: typeof parsed.background === "string" ? parsed.background : "原文未明确说明",
    methods: typeof parsed.methods === "string" ? parsed.methods : "原文未明确说明",
    results: typeof parsed.results === "string" ? parsed.results : "原文未明确说明",
    limitations:
      typeof parsed.limitations === "string" ? parsed.limitations : "原文未明确说明",
  };
}

/** 速读卡/摘要翻译：zh→中文整理，en→英文翻译，返回译文文本 */
export async function translateSummary(
  userId: string,
  sourceText: string,
  target: "zh" | "en"
): Promise<string> {
  const system =
    target === "en"
      ? "你是融研AI的学术翻译专家。把用户给出的中文文献摘要翻译成通顺、专业的英文，只输出译文本身，不要添加解释。"
      : "你是融研AI的学术翻译专家。把用户给出的英文文献摘要翻译成通顺、专业的中文，只输出译文本身，不要添加解释。";

  const { text } = await runPapersGenerate({
    userId,
    system,
    prompt: sourceText.slice(0, MAX_CONTEXT_CHARS),
    temperature: 0.2,
  });
  return text.trim();
}

/** 从速读卡拼接可翻译的完整摘要文本 */
export function buildSummarySourceText(cards: SummaryCards): string {
  return [
    `研究背景：${cards.background}`,
    `核心方法：${cards.methods}`,
    `实验结果：${cards.results}`,
    `局限性：${cards.limitations}`,
  ].join("\n");
}

/** 清洗前端提交的标签数组 */
export function normalizeTags(value: unknown): string[] {
  return sanitizeTagList(value, 8).map((tag) => tag.slice(0, 20));
}
