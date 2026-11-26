import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toJobApplication } from "@/lib/career/serialize";
import { z } from "zod";
import type { JobStatus } from "@/lib/career/types";

// 单条求职申请路由：PATCH 更新 / DELETE 删除
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

const UpdateJobApplicationSchema = z.object({
  company: z.string().min(1, "公司名称不能为空").max(100).optional(),
  position: z.string().min(1, "岗位名称不能为空").max(100).optional(),
  status: z.enum(["pending", "applied", "written_test", "interview", "offer", "rejected"]).optional(),
  interviewTime: z.string().datetime().optional().nullable(),
  salary: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

async function findOwnedApplication(userId: string, id: string) {
  return await prisma.jobApplication.findFirst({
    where: { id, userId },
  });
}

export async function PATCH(request: Request, props: { params: Params }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }
  const { id } = await props.params;

  const application = await findOwnedApplication(userId, id);
  if (!application) {
    return Response.json({ error: "求职记录不存在或无权限访问" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const validated = UpdateJobApplicationSchema.parse(body);

    const updateData: Partial<{
      company: string;
      position: string;
      status: string;
      interviewTime: Date | null;
      notes: string | null;
      offerDetails: string | null;
      salary: string | null;
    }> = {};
    if (validated.company !== undefined) updateData.company = validated.company;
    if (validated.position !== undefined) updateData.position = validated.position;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.interviewTime !== undefined) {
      updateData.interviewTime = validated.interviewTime ? new Date(validated.interviewTime) : null;
    }
    if (validated.salary !== undefined) updateData.salary = validated.salary;
    if (validated.notes !== undefined) updateData.notes = validated.notes;

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: updateData,
    });

    return Response.json({
      application: toJobApplication(updated),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    }
    return Response.json({ error: "请求参数错误" }, { status: 400 });
  }
}

export async function DELETE(_: Request, props: { params: Params }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }
  const { id } = await props.params;

  const application = await findOwnedApplication(userId, id);
  if (!application) {
    return Response.json({ error: "求职记录不存在或无权限访问" }, { status: 404 });
  }

  await prisma.jobApplication.delete({ where: { id } });
  return Response.json({ success: true, deletedId: id });
}
