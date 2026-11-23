import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// 错题本列表：支持按知识点标签（模糊包含）与掌握度（精确）筛选。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_MASTERY = new Set(["new", "learning", "mastered"]);

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const knowledgePoint = searchParams.get("knowledgePoint")?.trim() ?? "";
  const mastery = searchParams.get("mastery")?.trim() ?? "";

  const where: Prisma.WrongQuestionWhereInput = { userId };
  if (mastery) {
    if (!VALID_MASTERY.has(mastery)) {
      return Response.json(
        { error: "mastery 仅支持 new / learning / mastered" },
        { status: 400 }
      );
    }
    where.mastery = mastery;
  }
  if (knowledgePoint) {
    // SQLite 不支持数组字段，标签以逗号分隔存储，用 contains 做包含匹配
    where.knowledgePoint = { contains: knowledgePoint };
  }

  const records = await prisma.wrongQuestion.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  // 额外返回当前用户的全部知识点标签（供前端筛选下拉，不受筛选条件影响）
  const allRecords = await prisma.wrongQuestion.findMany({
    where: { userId },
    select: { knowledgePoint: true },
  });
  const tagSet = new Set<string>();
  for (const item of allRecords) {
    if (!item.knowledgePoint) continue;
    for (const tag of item.knowledgePoint.split(",")) {
      const trimmed = tag.trim();
      if (trimmed) tagSet.add(trimmed);
    }
  }

  return Response.json({
    records,
    tags: Array.from(tagSet).sort((a, b) => a.localeCompare(b, "zh-CN")),
  });
}
