import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 单条错题维护：更新复习标记（掌握度）/ 删除。所有操作先校验归属权。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_MASTERY = new Set(["new", "learning", "mastered"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.wrongQuestion.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return Response.json({ error: "错题不存在或无权操作" }, { status: 404 });
  }

  let body: { mastery?: unknown };
  try {
    body = (await request.json()) as { mastery?: unknown };
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  if (typeof body.mastery !== "string" || !VALID_MASTERY.has(body.mastery)) {
    return Response.json(
      { error: "mastery 仅支持 new / learning / mastered" },
      { status: 400 }
    );
  }

  const updated = await prisma.wrongQuestion.update({
    where: { id },
    data: { mastery: body.mastery },
  });
  return Response.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.wrongQuestion.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return Response.json({ error: "错题不存在或无权操作" }, { status: 404 });
  }

  await prisma.wrongQuestion.delete({ where: { id } });
  return Response.json({ ok: true, id });
}
