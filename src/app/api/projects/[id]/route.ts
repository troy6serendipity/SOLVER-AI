import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateString, validateArray, validateEnum } from "@/lib/validation";
import { withErrorHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";

// 单个项目操作路由
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/projects/[id] - 获取项目详情
 */
export const GET = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      files: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      notes: {
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!project) {
    throw new NotFoundError("项目不存在");
  }

  if (project.userId !== userId) {
    throw new ForbiddenError("无权访问该项目");
  }

  return Response.json({ project });
});

/**
 * PATCH /api/projects/[id] - 更新项目信息
 */
export const PATCH = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    throw new NotFoundError("项目不存在");
  }

  if (project.userId !== userId) {
    throw new ForbiddenError("无权修改该项目");
  }

  const body = await request.json();

  const updateData: Partial<{
    name: string;
    description: string | null;
    status: string;
    color: string;
    tags: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }> = {};

  if (body.name !== undefined) {
    updateData.name = validateString(body.name, "项目名称", 1, 100);
  }
  if (body.description !== undefined) {
    updateData.description = validateString(body.description, "项目描述", 0, 500) || undefined;
  }
  if (body.status !== undefined) {
    updateData.status = validateEnum(body.status, "状态", ["active", "archived", "completed"]);
  }
  if (body.tags !== undefined) {
    updateData.tags = body.tags ? JSON.stringify(validateArray(body.tags, "标签", (item, index) => validateString(item, `标签[${index}]`, 1, 20))) : undefined;
  }
  if (body.startDate !== undefined) {
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    if (startDate && isNaN(startDate.getTime())) {
      throw new BadRequestError("开始日期格式不正确");
    }
    updateData.startDate = startDate;
  }
  if (body.endDate !== undefined) {
    const endDate = body.endDate ? new Date(body.endDate) : undefined;
    if (endDate && isNaN(endDate.getTime())) {
      throw new BadRequestError("结束日期格式不正确");
    }
    updateData.endDate = endDate;
  }

  const updated = await prisma.project.update({
    where: { id },
    data: updateData,
  });

  return Response.json({ project: updated });
});

/**
 * DELETE /api/projects/[id] - 删除项目
 */
export const DELETE = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    throw new NotFoundError("项目不存在");
  }

  if (project.userId !== userId) {
    throw new ForbiddenError("无权删除该项目");
  }

  // 删除项目时将关联资源的projectId置空，不删除实际资源
  await prisma.$transaction([
    // 清空关联资源的projectId
    prisma.fileAsset.updateMany({
      where: { projectId: id, userId },
      data: { projectId: undefined },
    }),
    prisma.projectTask.updateMany({
      where: { projectId: id, userId },
      data: { projectId: undefined },
    }),
    prisma.researchNote.updateMany({
      where: { projectId: id, userId },
      data: { projectId: undefined },
    }),
    prisma.experimentRun.updateMany({
      where: { projectId: id, userId },
      data: { projectId: undefined },
    }),
    prisma.simulationSnapshot.updateMany({
      where: { projectId: id, userId },
      data: { projectId: undefined },
    }),
    // 最后删除项目
    prisma.project.delete({
      where: { id },
    }),
  ]);

  return Response.json({ success: true });
});