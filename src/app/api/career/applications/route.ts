import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toJobApplication } from "@/lib/career/serialize";
import { z } from "zod";
import type { JobStatus } from "@/lib/career/types";

// 求职申请集合路由：GET 列表 / POST 新建
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateJobApplicationSchema = z.object({
  company: z.string().min(1, "公司名称不能为空").max(100),
  position: z.string().min(1, "岗位名称不能为空").max(100),
  status: z.enum(["pending", "applied", "written_test", "interview", "offer", "rejected"]),
  interviewTime: z.string().datetime().optional().nullable(),
  salary: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const applications = await prisma.jobApplication.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return Response.json({
    records: applications.map(toJobApplication),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = CreateJobApplicationSchema.parse(body);

    const application = await prisma.jobApplication.create({
      data: {
        userId,
        company: validated.company,
        position: validated.position,
        status: validated.status,
        interviewDate: validated.interviewTime ? new Date(validated.interviewTime) : null,
        salary: validated.salary || null,
        notes: validated.notes || null,
      },
    });

    return Response.json(
      {
        application: toJobApplication(application),
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    }
    return Response.json({ error: "请求参数错误" }, { status: 400 });
  }
}
