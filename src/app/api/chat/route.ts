import {
  streamText,
  toUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
} from "ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SCENARIOS,
  getChatModel,
  isScenarioKey,
  type ModelTier,
  type ScenarioKey,
} from "@/lib/ai/models";
import { checkRateLimit, checkQuota, logUsage } from "@/lib/ai/gateway";
import { withErrorHandler } from "@/lib/errors";

// 鉴权 + Prisma 落库均依赖请求时环境，强制动态渲染、Node Runtime。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 入参约束：防止超长上下文与异常调用
const MAX_MESSAGES = 30;
const MAX_CONTENT_CHARS = 8000;
const MAX_SYSTEM_CHARS = 4000;

interface IncomingMessage {
  role?: unknown;
  content?: unknown;
}

interface ChatRequestBody {
  messages?: unknown;
  tier?: unknown;
  scenario?: unknown;
  system?: unknown;
}

export const POST = withErrorHandler(async (request: Request) => {
  // 1. 登录校验：未登录直接 401
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  // 2. 解析请求体
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  // 3. 校验并归一化 messages（仅接受 user / assistant 文本消息）
  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return Response.json(
      { error: "messages 必须是非空数组" },
      { status: 400 }
    );
  }
  if (rawMessages.length > MAX_MESSAGES) {
    return Response.json(
      { error: `单次对话最多 ${MAX_MESSAGES} 条消息` },
      { status: 400 }
    );
  }

  const messages: ModelMessage[] = [];
  for (const raw of rawMessages as IncomingMessage[]) {
    const role = raw?.role;
    const content = raw?.content;
    if (
      (role !== "user" && role !== "assistant") ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return Response.json(
        { error: "每条消息需包含合法的 role(user/assistant) 与非空 content" },
        { status: 400 }
      );
    }
    if (content.length > MAX_CONTENT_CHARS) {
      return Response.json(
        { error: `单条消息不能超过 ${MAX_CONTENT_CHARS} 字符` },
        { status: 400 }
      );
    }
    messages.push({ role, content });
  }

  // 最后一条必须是用户提问
  if (messages[messages.length - 1].role !== "user") {
    return Response.json(
      { error: "最后一条消息必须是用户提问" },
      { status: 400 }
    );
  }

  // 4. 解析场景与模型档位（显式入参优先，否则取场景预设）
  const scenario: ScenarioKey =
    typeof body.scenario === "string" && isScenarioKey(body.scenario)
      ? body.scenario
      : "general";
  const preset = SCENARIOS[scenario];

  const tier: ModelTier =
    body.tier === "light" || body.tier === "strong" ? body.tier : preset.tier;

  let systemPrompt: string = preset.system;
  if (typeof body.system === "string" && body.system.trim().length > 0) {
    if (body.system.length > MAX_SYSTEM_CHARS) {
      return Response.json(
        { error: `system 不能超过 ${MAX_SYSTEM_CHARS} 字符` },
        { status: 400 }
      );
    }
    systemPrompt = body.system;
  }

  // 5. 检查速率限制和配额
  await checkRateLimit(userId);
  await checkQuota(userId, scenario);

  // 模型工厂：有 Key 走云端 OpenAI 兼容模型，无 Key 走本地 Mock
  const { model, modelId, provider, mock } = await getChatModel(tier);

  // 6. 流式生成；onFinish 中把 Token 用量写入 AiUsageLog
  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    onFinish: async ({ usage }) => {
      try {
        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
        await logUsage(
          userId,
          scenario,
          modelId,
          provider,
          tier,
          inputTokens,
          outputTokens
        );
      } catch (error) {
        // 用量记录失败不应影响对话主链路
        console.error("[chat] 写入 AiUsageLog 失败:", error);
      }
    },
  });

  // 7. 转为 UI Message Stream（SSE 协议，后续前端 useChat 可直接消费）
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        console.error("[chat] 流式生成出错:", error);
        return "AI 服务暂时不可用，请稍后重试。";
      },
    }),
  });
});
