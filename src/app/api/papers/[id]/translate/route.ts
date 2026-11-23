import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildSummarySourceText,
  translateSummary,
} from "@/lib/ai/papers-service";
import { extractJson } from "@/lib/ai/review-service";
import type { SummaryCards, TranslationCache } from "@/lib/literature/types";

// 速读卡一键中英翻译：以速读卡文本为源（无速读卡时退回摘要），译文缓存到 paper.translation
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  let body: { target?: unknown };
  try {
    body = (await request.json()) as { target?: unknown };
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const target = body.target === "zh" || body.target === "en" ? body.target : null;
  if (!target) {
    return Response.json(
      { error: "target 仅支持 zh 或 en" },
      { status: 400 }
    );
  }

  const { id } = await params;
  const paper = await prisma.paper.findUnique({ where: { id } });
  if (!paper || paper.userId !== userId) {
    return Response.json({ error: "文献不存在或无权访问" }, { status: 404 });
  }

  // 命中缓存直接返回，避免重复消耗 Token
  const cached = extractJson<TranslationCache>(paper.translation ?? "");
  if (cached && typeof cached[target] === "string" && cached[target]) {
    return Response.json({ target, text: cached[target], cached: true });
  }

  // 源文本：优先速读卡，其次 abstract，最后全文开头
  const cards = extractJson<SummaryCards>(paper.summary ?? "");
  const sourceText = cards
    ? buildSummarySourceText(cards)
    : (paper.abstract ?? paper.fullText ?? "").slice(0, 4000);
  if (!sourceText.trim()) {
    return Response.json({ error: "没有可翻译的文本内容" }, { status: 422 });
  }

  try {
    const text = await translateSummary(userId, sourceText, target);
    const nextCache: TranslationCache = { ...(cached ?? {}), [target]: text };
    await prisma.paper.update({
      where: { id },
      data: { translation: JSON.stringify(nextCache) },
    });
    return Response.json({ target, text, cached: false });
  } catch (error) {
    console.error("[papers/translate] 翻译失败:", error);
    return Response.json(
      { error: "翻译失败，请稍后重试" },
      { status: 502 }
    );
  }
}
