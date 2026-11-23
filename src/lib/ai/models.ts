import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV4 } from "@ai-sdk/provider";

// 分档模型策略 + 业务场景预设（统一 AI 接入层的唯一配置入口）
// 环境变量见 .env：LLM_API_KEY 留空时自动回退到本地 Mock 模型。

export type ModelTier = "light" | "strong";

export interface ScenarioPreset {
  /** 该场景默认使用的模型档位 */
  tier: ModelTier;
  /** 该场景的默认系统提示词 */
  system: string;
  /** 场景中文名（用于日志/展示） */
  label: string;
}

/** 业务场景 → 默认档位与系统提示词，后续各模块直接按 scenario 调用 /api/chat */
export const SCENARIOS = {
  general: {
    tier: "light",
    label: "通用对话",
    system:
      "你是融研AI的通用助手，面向中国大学生，请用简洁准确的中文回答问题。",
  },
  review: {
    tier: "strong",
    label: "复习助手",
    system:
      "你是融研AI的复习助手。面对学生的提问，不要直接给出完整答案，而要通过追问式引导，先指出题目涉及的知识点，再给出分步思路与易错点提示，最后才给出参考解答，帮助学生真正掌握解题方法。",
  },
  papers: {
    tier: "light",
    label: "文献助手",
    system:
      "你是融研AI的文献助手，擅长速读学术论文、提炼研究背景/方法/结果/局限，并基于文献内容做可溯源的问答，不确定时明确说明。",
  },
  data: {
    tier: "light",
    label: "数据洞察",
    system:
      "你是融研AI的数据洞察助手，擅长解读统计结果与图表，用通俗语言解释数据含义、异常点与可能原因，并给出后续分析建议。",
  },
  experiments: {
    tier: "light",
    label: "实验台账",
    system:
      "你是融研AI的实验助手，擅长把零散实验记录归纳为结构化摘要（目的、步骤、现象、结论），并辅助撰写周报。",
  },
  lab: {
    tier: "strong",
    label: "原理实验室",
    system:
      "你是融研AI的原理实验室助手，擅长结合交互式仿真参数，解释公式推导、物理/化学原理与参数变化对结果的影响。",
  },
  jobs: {
    tier: "strong",
    label: "求职助手",
    system:
      "你是融研AI的求职助手，提供简历优化建议与模拟面试点评。点评要具体、可执行，先肯定亮点再指出问题，并给出修改范例。",
  },
} as const satisfies Record<string, ScenarioPreset>;

export type ScenarioKey = keyof typeof SCENARIOS;

export const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioKey[];

export function isScenarioKey(value: string): value is ScenarioKey {
  return (SCENARIO_KEYS as string[]).includes(value);
}

// ===== 环境配置（只读一次，避免重复创建 provider）=====
const apiKey = process.env.LLM_API_KEY?.trim() ?? "";
const baseURL = process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1";
const providerId = process.env.LLM_PROVIDER_ID?.trim() || "openai-compatible";
const lightModelId = process.env.LLM_LIGHT_MODEL?.trim() || "gpt-4o-mini";
const strongModelId = process.env.LLM_STRONG_MODEL?.trim() || "gpt-4o";
const forceMock = process.env.LLM_MOCK?.trim().toLowerCase() === "true";

/** 是否运行在本地 Mock 模式（无 Key 或显式开关） */
export function isMockMode(): boolean {
  return forceMock || apiKey.length === 0;
}

/** 按档位取模型 ID */
export function getModelId(tier: ModelTier): string {
  return tier === "strong" ? strongModelId : lightModelId;
}

// OpenAI 兼容 provider 单例（DeepSeek / 通义千问兼容模式均走此入口）
// v4 起第三方兼容端点只需 baseURL；name 用于在用量记录中标识真实供应商。
const openaiCompatible =
  apiKey.length > 0
    ? createOpenAI({ baseURL, apiKey, name: providerId })
    : null;

export interface ResolvedModel {
  model: LanguageModelV4;
  modelId: string;
  provider: string;
  mock: boolean;
}

/**
 * 模型工厂：按档位返回可用模型。
 * - 配置了 LLM_API_KEY：返回 OpenAI 兼容云端模型
 * - 未配置 / 强制 Mock：动态加载本地 MockLanguageModelV4（不污染真实模型打包路径）
 */
export async function getChatModel(tier: ModelTier): Promise<ResolvedModel> {
  const modelId = getModelId(tier);

  if (isMockMode()) {
    const { createMockModel } = await import("./mock-model");
    return {
      model: createMockModel(modelId),
      modelId,
      provider: "mock",
      mock: true,
    };
  }

  return {
    model: openaiCompatible!.chat(modelId),
    modelId,
    provider: providerId,
    mock: false,
  };
}
