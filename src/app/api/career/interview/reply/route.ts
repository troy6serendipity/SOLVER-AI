import { auth } from "@/lib/auth";
import { generateInterviewQuestion } from "@/lib/ai/career-service";
import { z } from "zod";
import type { InterviewMessage } from "@/lib/career/types";

// 模拟面试回复接口
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const InterviewReplySchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(["interviewer", "candidate"]),
      content: z.string(),
      timestamp: z.string(),
    })
  ),
  userReply: z.string().min(1, "回复内容不能为空").max(5000),
  resumeText: z.string().min(1, "简历内容不能为空").max(10000),
  jdText: z.string().min(1, "JD内容不能为空").max(10000),
  type: z.enum(["technical", "hr"]),
});

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = InterviewReplySchema.parse(body);

    // 构建新的历史记录
    const newHistory: InterviewMessage[] = [
      ...validated.history,
      {
        role: "candidate",
        content: validated.userReply,
        timestamp: new Date().toISOString(),
      },
    ];

    // 生成下一个问题
    const nextQuestion = await generateInterviewQuestion(
      userId,
      newHistory,
      validated.resumeText,
      validated.jdText,
      validated.type
    );

    return Response.json({ message: nextQuestion });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    }
    return Response.json({ error: "回复失败，请稍后重试" }, { status: 500 });
  }
}
