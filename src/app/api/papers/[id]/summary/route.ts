import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePaperSummary } from "@/lib/ai/papers-service";
import type { SummaryCards } from "@/lib/literature/types";

// （重新）生成三分钟速读卡
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
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
  if (!paper.fullText) {
    return Response.json({ error: "该文献缺少可用全文" }, { status: 422 });
  }

  try {
    const cards = await generatePaperSummary(userId, paper.title, paper.fullText);
    if (!cards) {
      return Response.json(
        { error: "速读卡生成失败：模型未返回合法结构，请稍后重试" },
        { status: 502 }
      );
    }
    const updated = await prisma.paper.update({
      where: { id },
      data: { summary: JSON.stringify(cards) },
    });
    return Response.json({
      summary: cards as SummaryCards,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[papers/summary] 生成失败:", error);
    return Response.json(
      { error: "速读卡生成失败，请稍后重试" },
      { status: 502 }
    );
  }
}
