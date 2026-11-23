import { auth } from "@/lib/auth";
import { matchJobs } from "@/lib/ai/career-service";
import { z } from "zod";

// 岗位匹配接口
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JobMatchSchema = z.object({
  resumeText: z.string().min(1, "简历内容不能为空").max(10000),
  jobs: z.array(
    z.object({
      jobName: z.string().min(1, "岗位名称不能为空").max(100),
      jdText: z.string().min(1, "JD内容不能为空").max(10000),
    })
  ).min(1, "至少需要一个岗位"),
});

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = JobMatchSchema.parse(body);

    const matches = await matchJobs(userId, {
      resumeText: validated.resumeText,
      jobs: validated.jobs,
    });

    return Response.json({ matches });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    }
    return Response.json({ error: "岗位匹配失败，请稍后重试" }, { status: 500 });
  }
}
