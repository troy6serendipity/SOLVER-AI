import {
  streamText,
  toUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
} from "ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChatModel } from "@/lib/ai/models";
import type { PaperParagraph } from "@/lib/literature/types";

// 溯源问答（防幻觉）：服务端注入编号原文段落，强约束 AI 只能依据原文回答并标注 [段落 N]。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_CONTEXT_CHARS = 12000;
const MAX_HISTORY = 6;
const MAX_QUESTION_CHARS = 2000;

const SYSTEM_PROMPT = [
  "你是融研AI的文献溯源问答助手，必须严格遵守以下规则：",
  "1. 只能依据用户提供的「原文段落」回答问题，禁止编造原文不存在的数据、结论或引用；",
  "2. 每一个事实性论断句末都必须标注来源段落编号，格式为 [段落 N]，N 必须是上下文中真实存在的段落号；",
  "3. 若原文段落不足以回答问题，直接说明「原文未提供相关信息」，不要臆测；",
  "4. 回答使用中文，条理清晰，优先分点；可以综合多个段落，但每个要点都要带引用；",
  "5. 不要输出你是 AI、不要寒暄，直接给出带引用的回答。",
].join("\n");

function buildParagraphContext(paragraphs: PaperParagraph[]): {
  context: string;
  truncated: boolean;
} {
  const lines: string[] = [];
  let used = 0;
  let truncated = false;

  for (const paragraph of paragraphs) {
    const line = `[段落 ${paragraph.index}] ${paragraph.text}`;
    if (used + line.length > MAX_CONTEXT_CHARS) {
      truncated = true;
      break;
    }
    lines.push(line);
    used += line.length + 1;
  }

  return {
    context: lines.join("\n"),
    truncated,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;
  const paper = await prisma.paper.findUnique({ where: { id } });
  if (!paper || paper.userId !== userId) {
    return Response.json({ error: "文献不存在或无权访问" }, { status: 404 });
  }

  let paragraphs: PaperParagraph[] = [];
  try {
    paragraphs = paper.paragraphs
      ? (JSON.parse(paper.paragraphs) as PaperParagraph[])
      : [];
  } catch {
    paragraphs = [];
  }
  if (paragraphs.length === 0) {
    return Response.json(
      { error: "该文献没有可用的原文段落，无法溯源问答" },
      { status: 422 }
    );
  }

  let body: { question?: unknown; history?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return Response.json({ error: "问题不能为空" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json(
      { error: `问题不能超过 ${MAX_QUESTION_CHARS} 字符` },
      { status: 400 }
    );
  }

  // 历史消息仅接受 user/assistant 文本，取最近 MAX_HISTORY 条
  const history: ModelMessage[] = [];
  if (Array.isArray(body.history)) {
    for (const item of body.history.slice(-MAX_HISTORY)) {
      const role = (item as { role?: unknown })?.role;
      const content = (item as { content?: unknown })?.content;
      if (
        (role === "user" || role === "assistant") &&
        typeof content === "string" &&
        content.trim()
      ) {
        history.push({ role, content: content.slice(0, MAX_QUESTION_CHARS) });
      }
    }
  }

  const { context, truncated } = buildParagraphContext(paragraphs);
  const contextNotice = truncated
    ? "\n（注意：原文较长，仅提供了前序段落作为上下文，超出部分未包含）"
    : "";

  const { model, modelId, provider, mock } = await getChatModel("light");

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `论文标题：${paper.title}\n\n原文段落：\n${context}${contextNotice}`,
      },
      ...history,
      { role: "user", content: question },
    ],
    onFinish: async ({ usage }) => {
      try {
        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
        await prisma.aiUsageLog.create({
          data: {
            userId,
            tier: "light",
            scenario: "papers",
            provider,
            model: modelId,
            inputTokens,
            outputTokens,
            totalTokens: usage.totalTokens ?? inputTokens + outputTokens,
            mock,
          },
        });
      } catch (error) {
        console.error("[papers/ask] 写入 AiUsageLog 失败:", error);
      }
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        console.error("[papers/ask] 流式生成出错:", error);
        return "文献问答服务暂时不可用，请稍后重试。";
      },
    }),
  });
}
