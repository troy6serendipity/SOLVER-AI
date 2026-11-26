import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateString, validateArray, validateBoolean, validateEnum } from "@/lib/validation";
import { withErrorHandler, BadRequestError } from "@/lib/errors";

// 项目空间API路由
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/projects - 获取用户项目列表
 */
export const GET = withErrorHandler(async (request: Request) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "active";
  const allowedStatus = ["active", "archived", "completed"];
  if (!allowedStatus.includes(status)) {
    throw new BadRequestError(`状态仅允许值: ${allowedStatus.join(", ")}`);
  }

  const projects = await prisma.project.findMany({
    where: {
      userId,
      status,
    },
    include: {
      _count: {
        select: {
          tasks: true,
          files: true,
          notes: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return Response.json({ projects });
});

/**
 * POST /api/projects - 创建新项目
 */
export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const body = await request.json();

  const name = validateString(body.name, "项目名称", 1, 100);
  const description = body.description ? validateString(body.description, "项目描述", 0, 500) : undefined;
  const tags = body.tags ? validateArray(body.tags, "标签", (item, index) => validateString(item, `标签[${index}]`, 1, 20)) : undefined;
  const startDate = body.startDate ? new Date(body.startDate) : undefined;
  const endDate = body.endDate ? new Date(body.endDate) : undefined;

  if (startDate && isNaN(startDate.getTime())) {
    throw new BadRequestError("开始日期格式不正确");
  }
  if (endDate && isNaN(endDate.getTime())) {
    throw new BadRequestError("结束日期格式不正确");
  }

  const project = await prisma.project.create({
    data: {
      userId,
      name,
      description,
      tags: tags ? JSON.stringify(tags) : null,
      startDate,
      endDate,
    },
  });

  return Response.json({ project }, { status: 201 });
});