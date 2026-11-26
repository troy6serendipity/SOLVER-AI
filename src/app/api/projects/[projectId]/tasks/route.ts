import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateString, validateArray, validateEnum } from "@/lib/validation";
import { withErrorHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";

// 项目任务API路由
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/projects/[projectId]/tasks - 获取项目任务列表
 */
export const GET = withErrorHandler(async (request: Request, { params }: { params: Promise<{ projectId: string }> }) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { projectId } = await params;

  // 校验项目归属
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project) {
    throw new NotFoundError("项目不存在");
  }

  if (project.userId !== userId) {
    throw new ForbiddenError("无权访问该项目");
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  const where: {
    projectId: string;
    userId: string;
    status?: string;
    priority?: string;
  } = {
    projectId,
    userId,
  };

  if (status) where.status = validateEnum(status, "状态", ["todo", "in_progress", "done", "blocked"]);
  if (priority) where.priority = validateEnum(priority, "优先级", ["low", "medium", "high"]);

  const tasks = await prisma.projectTask.findMany({
    where,
    orderBy: [
      { priority: "desc" },
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });

  return Response.json({ tasks });
});

/**
 * POST /api/projects/[projectId]/tasks - 创建项目任务
 */
export const POST = withErrorHandler(async (request: Request, { params }: { params: Promise<{ projectId: string }> }) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { projectId } = await params;

  // 校验项目归属
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project) {
    throw new NotFoundError("项目不存在");
  }

  if (project.userId !== userId) {
    throw new ForbiddenError("无权修改该项目");
  }

  const body = await request.json();

  const title = validateString(body.title, "任务标题", 1, 200);
  const description = body.description ? validateString(body.description, "任务描述", 0, 1000) : undefined;
  const priority = body.priority ? validateEnum(body.priority, "优先级", ["low", "medium", "high"]) : "medium";
  const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
  const tags = body.tags ? validateArray(body.tags, "标签", (item, index) => validateString(item, `标签[${index}]`, 1, 20)) : undefined;

  if (dueDate && isNaN(dueDate.getTime())) {
    throw new BadRequestError("截止日期格式不正确");
  }

  const task = await prisma.projectTask.create({
    data: {
      userId,
      projectId,
      title,
      description,
      priority,
      dueDate,
      tags: tags ? JSON.stringify(tags) : null,
    },
  });

  return Response.json({ task }, { status: 201 });
});