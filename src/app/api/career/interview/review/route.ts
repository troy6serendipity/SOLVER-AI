import { auth } from "@/lib/auth";
import { generateInterviewReview } from "@/lib/ai/career-service";
import { z } from "zod";

// 面试点评生成接口
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const InterviewReviewSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(["interviewer", "candidate"]),
      content: z.string(),
      timestamp: z.string(),
    })
  ).min(1, "面试记录不能为空"),
});

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = InterviewReviewSchema.parse(body);

    const review = await generateInterviewReview(userId, validated.history);

    return Response.json({ review });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    }
    return Response.json({ error: "生成点评失败，请稍后重试" }, { status: 500 });
  }
}
