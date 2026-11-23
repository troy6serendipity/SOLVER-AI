import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  runReviewGenerate,
  extractJson,
  sanitizeTagList,
} from "@/lib/ai/review-service";

// 收入错题本：AI 自动提取学科、知识点标签与核心公式，落库 WrongQuestion。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_QUESTION_CHARS = 8000;
const MAX_ANALYSIS_CHARS = 8000;
const VALID_SOURCES = new Set(["manual", "review", "ocr"]);

const SYSTEM_PROMPT = [
  "你是融研AI复习助手的教研专家。",
  "根据学生提供的题目与解题思路，抽取结构化信息，并且只输出一个 JSON 对象，不要输出任何解释或 markdown 代码块。",
  "JSON 字段：",
  '{"subject":"学科名称，如 高等数学/大学物理/线性代数，无法判断时填 未分类",',
  '"knowledgePoints":["知识点标签1","知识点标签2"]，',
  '"formulas":["本题涉及的核心公式或定理1","核心公式2"]，',
  '"summary":"100字以内的解题思路摘要"}',
  "要求：知识点 2-5 个、公式 0-4 个；纯计算题没有公式时 formulas 返回空数组。",
].join("\n");

interface Extraction {
  subject?: unknown;
  knowledgePoints?: unknown;
  formulas?: unknown;
  summary?: unknown;
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  let body: {
    question?: unknown;
    analysis?: unknown;
    answer?: unknown;
    source?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return Response.json({ error: "题目内容不能为空" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json(
      { error: `题目不能超过 ${MAX_QUESTION_CHARS} 字符` },
      { status: 400 }
    );
  }

  const analysis =
    typeof body.analysis === "string" && body.analysis.trim()
      ? body.analysis.trim().slice(0, MAX_ANALYSIS_CHARS)
      : null;
  const answer =
    typeof body.answer === "string" && body.answer.trim()
      ? body.answer.trim().slice(0, MAX_ANALYSIS_CHARS)
      : null;
  const source =
    typeof body.source === "string" && VALID_SOURCES.has(body.source)
      ? body.source
      : "review";

  // 1. 调用强模型抽取结构化信息；失败时使用兜底值，保证保存链路不中断
  let subject = "未分类";
  let knowledgePoints: string[] = [];
  let formulas: string[] = [];
  let summary: string | null = null;
  let modelId = "none";
  let mock = false;

  try {
    const result = await runReviewGenerate({
      userId,
      scenario: "review",
      tier: "strong",
      system: SYSTEM_PROMPT,
      prompt: `题目：\n${question}\n\n解题思路/对话记录：\n${analysis ?? "（无）"}`,
      temperature: 0.2,
    });
    modelId = result.modelId;
    mock = result.mock;

    const parsed = extractJson<Extraction>(result.text);
    if (parsed) {
      if (typeof parsed.subject === "string" && parsed.subject.trim()) {
        subject = parsed.subject.trim().slice(0, 30);
      }
      knowledgePoints = sanitizeTagList(parsed.knowledgePoints, 5);
      formulas = sanitizeTagList(parsed.formulas, 4);
      if (typeof parsed.summary === "string" && parsed.summary.trim()) {
        summary = parsed.summary.trim().slice(0, 300);
      }
    }
  } catch (error) {
    console.error("[review/save-wrong] AI 抽取失败，使用兜底值:", error);
  }

  // 2. 落库：知识点逗号分隔，公式 JSON 数组，思路优先用对话记录
  const record = await prisma.wrongQuestion.create({
    data: {
      userId,
      subject,
      question,
      answer,
      analysis: analysis ?? summary,
      knowledgePoint:
        knowledgePoints.length > 0 ? knowledgePoints.join(",") : null,
      formulas: formulas.length > 0 ? JSON.stringify(formulas) : null,
      source,
      mastery: "new",
    },
  });

  return Response.json(
    {
      ...record,
      knowledgePoints,
      formulas,
      extractedBy: modelId,
      mock,
    },
    { status: 201 }
  );
}
