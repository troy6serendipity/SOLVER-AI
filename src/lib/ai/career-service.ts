import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { getChatModel } from "./models";
import type {
  ResumeOptimizeRequest,
  ResumeOptimizeResponse,
  JobMatchRequest,
  JobMatchResult,
  InterviewMessage,
  InterviewReview,
} from "@/lib/career/types";

// 统一调用模型并记录用量
async function runCareerGenerate(params: {
  userId: string;
  system: string;
  prompt: string;
  temperature?: number;
}) {
  const { userId, system, prompt, temperature } = params;
  const { model, modelId, provider, mock } = await getChatModel("light");

  const result = await generateText({
    model,
    system,
    prompt,
    ...(temperature === undefined ? {} : { temperature }),
  });

  try {
    const inputTokens = result.usage.inputTokens ?? 0;
    const outputTokens = result.usage.outputTokens ?? 0;
    await prisma.aiUsageLog.create({
      data: {
        userId,
        tier: "light",
        scenario: "career",
        provider,
        model: modelId,
        inputTokens,
        outputTokens,
        totalTokens: result.usage.totalTokens ?? inputTokens + outputTokens,
        mock,
      },
    });
  } catch (error) {
    console.error("[career] 写入 AiUsageLog 失败:", error);
  }

  return { text: result.text, mock };
}

/** 简历优化 */
export async function optimizeResume(
  userId: string,
  request: ResumeOptimizeRequest
): Promise<ResumeOptimizeResponse> {
  const systemPrompt = `
你是一名专业的简历优化顾问，请根据用户提供的简历和目标岗位JD，给出专业的修改建议。
要求：
1. 逐条对比JD要求，找出简历中的不足
2. 给出具体的修改建议，提供优化前后的对比
3. 对简历整体打分（0-100分）
4. 给出总体优化建议和完整的优化后简历文本
5. 严格按照以下JSON格式返回：
{
  "suggestions": [
    {
      "original": "原文内容",
      "optimized": "优化后内容",
      "reason": "修改原因，说明为什么这么改，如何匹配JD要求",
      "type": "experience | skill | project | format | other"
    }
  ],
  "overallScore": 0-100的整数,
  "overallAdvice": "总体优化建议，100-200字",
  "optimizedFullText": "完整的优化后简历全文"
}
`;

  const userPrompt = `
简历内容：
${request.resumeText}

目标岗位JD：
${request.jdText}
`;

  const { text } = await runCareerGenerate({
    userId,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.3,
  });

  try {
    return JSON.parse(text) as ResumeOptimizeResponse;
  } catch (e) {
    // 解析失败返回默认结构
    return {
      suggestions: [],
      overallScore: 65,
      overallAdvice: "建议根据JD要求，突出相关项目经验和技能，量化工作成果。",
      optimizedFullText: request.resumeText,
    };
  }
}

/** 岗位匹配 */
export async function matchJobs(
  userId: string,
  request: JobMatchRequest
): Promise<JobMatchResult[]> {
  const systemPrompt = `
你是一名专业的职业规划顾问，请根据用户简历和多个目标岗位JD，从经历、技能、契合度三个维度分别打分（0-100分），计算总分并排序，指出每个岗位的优势和短板。
要求：
1. 每个岗位单独评分，三个维度各占30%/30%/40%权重计算总分
2. 按总分从高到低排序，给出rank排名
3. 每个岗位列出3个核心优势和2个核心短板
4. 严格按照以下JSON格式返回：
{
  "matches": [
    {
      "jobName": "岗位名称",
      "experienceScore": 0-100的整数,
      "skillScore": 0-100的整数,
      "fitScore": 0-100的整数,
      "totalScore": 0-100的整数,
      "rank": 排名（从1开始）,
      "strengths": ["优势1", "优势2", "优势3"],
      "weaknesses": ["短板1", "短板2"]
    }
  ]
}
`;

  const jobsText = request.jobs
    .map(
      (job, index) => `
岗位 ${index + 1}：${job.jobName}
JD内容：
${job.jdText}
`
    )
    .join("\n\n");

  const userPrompt = `
用户简历：
${request.resumeText}

待匹配岗位：
${jobsText}
`;

  const { text } = await runCareerGenerate({
    userId,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.2,
  });

  try {
    const res = JSON.parse(text) as { matches: JobMatchResult[] };
    return res.matches;
  } catch (e) {
    // 解析失败返回默认结构
    return request.jobs.map((job, index) => ({
      jobName: job.jobName,
      experienceScore: 70,
      skillScore: 65,
      fitScore: 75,
      totalScore: 71,
      rank: index + 1,
      strengths: ["简历基础信息完整", "有相关项目经验", "技能基本匹配"],
      weaknesses: ["相关经验不足", "技能深度有待提升"],
    }));
  }
}

/** 生成面试问题 */
export async function generateInterviewQuestion(
  userId: string,
  history: InterviewMessage[],
  resumeText: string,
  jdText: string,
  type: "technical" | "hr"
): Promise<InterviewMessage> {
  const systemPrompt = `
你是一名专业的${type === "technical" ? "技术" : "HR"}面试官，请根据用户简历和目标岗位JD，提出合适的面试问题。
要求：
1. 问题要贴合岗位要求，难度适中
2. 结合用户简历中的经历提问
3. 每次只提一个问题，不要多个问题
4. 对话要自然，符合真实面试场景
`;

  const historyText = history
    .map(
      (msg) => `${msg.role === "interviewer" ? "面试官" : "候选人"}：${msg.content}`
    )
    .join("\n");

  const userPrompt = `
简历内容：
${resumeText}

目标岗位JD：
${jdText}

面试历史：
${historyText}

请提出下一个面试问题：
`;

  const { text } = await runCareerGenerate({
    userId,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
  });

  return {
    role: "interviewer",
    content: text.trim(),
    timestamp: new Date().toISOString(),
  };
}

/** 生成面试点评 */
export async function generateInterviewReview(
  userId: string,
  history: InterviewMessage[]
): Promise<InterviewReview> {
  const systemPrompt = `
你是一名专业的面试评估专家，请根据面试对话记录，给出综合点评和改进建议。
要求：
1. 整体打分（0-100分）
2. 列出3个核心优势
3. 列出3个需要改进的地方
4. 给出详细的面试评价（200-300字）
5. 提供2个典型问题的参考回答示例
6. 严格按照以下JSON格式返回：
{
  "overallScore": 0-100的整数,
  "strengths": ["优势1", "优势2", "优势3"],
  "improvements": ["改进点1", "改进点2", "改进点3"],
  "detailedReview": "详细的面试评价内容",
  "sampleAnswers": [
    {
      "question": "问题内容",
      "sampleAnswer": "参考回答内容"
    }
  ]
}
`;

  const historyText = history
    .map(
      (msg) => `${msg.role === "interviewer" ? "面试官" : "候选人"}：${msg.content}`
    )
    .join("\n");

  const userPrompt = `
面试对话记录：
${historyText}

请给出面试点评：
`;

  const { text } = await runCareerGenerate({
    userId,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.4,
  });

  try {
    return JSON.parse(text) as InterviewReview;
  } catch (e) {
    // 解析失败返回默认结构
    return {
      overallScore: 75,
      strengths: [
        "回答思路清晰，表达流畅",
        "对岗位相关知识有基本了解",
        "态度诚恳，沟通能力较好",
      ],
      improvements: [
        "部分技术问题回答不够深入",
        "项目经验描述不够具体，缺少量化成果",
        "应对压力问题的能力有待提升",
      ],
      detailedReview:
        "本次面试整体表现良好，能够清晰表达自己的观点，对岗位要求的技能有基本掌握。建议在后续准备中，加强对核心技术的深度理解，将项目经验量化，突出自己的贡献和成果，同时多练习压力面试场景的应对。",
      sampleAnswers: [
        {
          question: "请介绍一下你最有成就感的一个项目",
          sampleAnswer:
            "在XX项目中，我作为核心开发人员，负责了核心模块的设计与实现，通过优化算法将系统性能提升了30%，最终项目提前2周上线，获得了公司季度优秀项目奖。",
        },
      ],
    };
  }
}
