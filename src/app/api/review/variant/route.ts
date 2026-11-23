import { auth } from "@/lib/auth";
import { runReviewGenerate } from "@/lib/ai/review-service";

// 生成同类变式题：根据当前题目产出 1 道同知识点、不同情境的自测题（不给答案）。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_QUESTION_CHARS = 8000;

const SYSTEM_PROMPT = [
  "你是融研AI复习助手的出题专家。",
  "根据学生给出的原题，生成 1 道『同类变式题』：考查相同核心知识点，但更换数值、情境或设问角度，难度与原题相当。",
  "要求：",
  "1. 只输出变式题题干本身，语言简洁、条件完整、可直接作答；",
  "2. 不要输出答案、解析或任何寒暄；",
  "3. 若是证明题/论述题，明确写出需要证明或论述的结论。",
].join("\n");

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  let body: { question?: unknown };
  try {
    body = (await request.json()) as { question?: unknown };
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return Response.json({ error: "原题内容不能为空" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json(
      { error: `题目不能超过 ${MAX_QUESTION_CHARS} 字符` },
      { status: 400 }
    );
  }

  try {
    const result = await runReviewGenerate({
      userId,
      scenario: "review",
      tier: "strong",
      system: SYSTEM_PROMPT,
      prompt: `原题如下：\n${question}`,
      temperature: 0.8,
    });

    return Response.json({
      question: result.text.trim(),
      model: result.modelId,
      mock: result.mock,
    });
  } catch (error) {
    console.error("[review/variant] 生成变式题失败:", error);
    return Response.json(
      { error: "变式题生成失败，请稍后重试" },
      { status: 502 }
    );
  }
}
