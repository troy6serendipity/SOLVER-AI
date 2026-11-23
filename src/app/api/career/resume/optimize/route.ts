import { auth } from "@/lib/auth";
import { optimizeResume } from "@/lib/ai/career-service";
import { z } from "zod";

// 简历优化接口
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ResumeOptimizeSchema = z.object({
  resumeText: z.string().min(1, "简历内容不能为空").max(10000),
  jdText: z.string().min(1, "JD内容不能为空").max(10000),
});

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = ResumeOptimizeSchema.parse(body);

    const result = await optimizeResume(userId, {
      resumeText: validated.resumeText,
      jdText: validated.jdText,
    });

    return Response.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    }
    return Response.json({ error: "简历优化失败，请稍后重试" }, { status: 500 });
  }
}
