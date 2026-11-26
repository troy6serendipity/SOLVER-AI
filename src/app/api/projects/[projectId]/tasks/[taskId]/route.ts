import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateString, validateArray, validateEnum } from "@/lib/validation";
import { withErrorHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";

// 单个项目任务操作路由
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/projects/[projectId]/tasks/[taskId] - 获取任务详情
 */
export const GET = withErrorHandler(async (request: Request, { params }: { params: Promise<{ projectId: string; taskId: string }> }) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { projectId, taskId } = await params;

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new NotFoundError("任务不存在");
  }

  if (task.userId !== userId || task.projectId !== projectId) {
    throw new ForbiddenError("无权访问该任务");
  }

  return Response.json({ task });
});

/**
 * PATCH /api/projects/[projectId]/tasks/[taskId] - 更新任务
 */
export const PATCH = withErrorHandler(async (request: Request, { params }: { params: Promise<{ projectId: string; taskId: string }> }) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { projectId, taskId } = await params;

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new NotFoundError("任务不存在");
  }

  if (task.userId !== userId || task.projectId !== projectId) {
    throw new ForbiddenError("无权修改该任务");
  }

  const body = await request.json();

  const updateData: Partial<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: Date | null;
    tags: string | null;
  }> = {};

  if (body.title !== undefined) {
    updateData.title = validateString(body.title, "任务标题", 1, 200);
  }
  if (body.description !== undefined) {
    updateData.description = validateString(body.description, "任务描述", 0, 1000) || undefined;
  }
  if (body.status !== undefined) {
    updateData.status = validateEnum(body.status, "状态", ["todo", "in_progress", "done", "blocked"]);
  }
  if (body.priority !== undefined) {
    updateData.priority = validateEnum(body.priority, "优先级", ["low", "medium", "high"]);
  }
  if (body.dueDate !== undefined) {
    const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
    if (dueDate && isNaN(dueDate.getTime())) {
      throw new BadRequestError("截止日期格式不正确");
    }
    updateData.dueDate = dueDate;
  }
  if (body.tags !== undefined) {
    updateData.tags = body.tags ? JSON.stringify(validateArray(body.tags, "标签", (item, index) => validateString(item, `标签[${index}]`, 1, 20))) : undefined;
  }

  const updated = await prisma.projectTask.update({
    where: { id: taskId },
    data: updateData,
  });

  return Response.json({ task: updated });
});

/**
 * DELETE /api/projects/[projectId]/tasks/[taskId] - 删除任务
 */
export const DELETE = withErrorHandler(async (request: Request, { params }: { params: Promise<{ projectId: string; taskId: string }> }) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { projectId, taskId } = await params;

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new NotFoundError("任务不存在");
  }

  if (task.userId !== userId || task.projectId !== projectId) {
    throw new ForbiddenError("无权删除该任务");
  }

  await prisma.projectTask.delete({
    where: { id: taskId },
  });

  return Response.json({ success: true });
});