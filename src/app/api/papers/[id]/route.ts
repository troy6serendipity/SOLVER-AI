import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTags } from "@/lib/ai/papers-service";
import { toPaperDetail, toPaperListItem } from "@/lib/literature/serialize";

// 单篇文献维护：详情 / 标签与收藏更新 / 删除
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadOwnedPaper(id: string, userId: string) {
  const paper = await prisma.paper.findUnique({ where: { id } });
  if (!paper || paper.userId !== userId) return null;
  return paper;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;
  const paper = await loadOwnedPaper(id, userId);
  if (!paper) {
    return Response.json({ error: "文献不存在或无权访问" }, { status: 404 });
  }
  return Response.json({ paper: toPaperDetail(paper) });
}

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
  const paper = await loadOwnedPaper(id, userId);
  if (!paper) {
    return Response.json({ error: "文献不存在或无权访问" }, { status: 404 });
  }

  let body: { tags?: unknown; favorite?: unknown; title?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const data: { tags?: string; favorite?: boolean; title?: string } = {};

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return Response.json({ error: "tags 必须是字符串数组" }, { status: 400 });
    }
    const cleaned = normalizeTags(body.tags);
    data.tags = JSON.stringify(cleaned);
  }
  if (body.favorite !== undefined) {
    if (typeof body.favorite !== "boolean") {
      return Response.json({ error: "favorite 必须是布尔值" }, { status: 400 });
    }
    data.favorite = body.favorite;
  }
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return Response.json({ error: "标题不能为空" }, { status: 400 });
    }
    data.title = body.title.trim().slice(0, 200);
  }

  const updated = await prisma.paper.update({ where: { id }, data });
  return Response.json({ paper: toPaperListItem(updated) });
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
  const paper = await loadOwnedPaper(id, userId);
  if (!paper) {
    return Response.json({ error: "文献不存在或无权访问" }, { status: 404 });
  }

  await prisma.paper.delete({ where: { id } });
  return Response.json({ ok: true, id });
}
