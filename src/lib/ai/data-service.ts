import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { getChatModel } from "./models";
import { extractJson } from "./review-service";
import type { CellValue, ColumnMeta } from "@/lib/data/types";

// 数据洞察模块的非流式 AI 能力：
// 把「表头 + 字段统计 + 数据样本」交给大模型，由模型返回标准 ECharts option 与文字解读。
// 统一走轻量模型（SCENARIOS.data.tier = light），并把 Token 用量写入 AiUsageLog。

export const ALLOWED_CHART_TYPES = ["scatter", "line", "bar", "heatmap"] as const;

/** 送入模型的数据样本上限（行 / 字符） */
const MAX_SAMPLE_ROWS = 300;
const MAX_CONTEXT_CHARS = 14000;

export interface GeneratedChart {
  title: string;
  chartType: string;
  option: Record<string, unknown>;
  insight: string;
}

/** 把字段定义、统计信息与数据样本拼成结构化上下文（格式与 mock 模型约定一致） */
export function buildSchemaContext(params: {
  name: string;
  headers: string[];
  columns: ColumnMeta[];
  rows: CellValue[][];
}): string {
  const { name, headers, columns, rows } = params;
  const sample = [headers, ...rows.slice(0, MAX_SAMPLE_ROWS)];
  const context = [
    `数据集：${name}`,
    `行数：${rows.length}，列数：${headers.length}`,
    "",
    "【列定义】",
    JSON.stringify(columns),
    "",
    "【数据样本】",
    JSON.stringify(sample),
    "",
    "【需求】",
  ].join("\n");
  return context;
}

const CHART_SYSTEM_PROMPT = [
  "你是融研AI的数据可视化专家。请根据提供的字段定义、统计信息与数据样本，生成一份可直接被 ECharts 渲染的图表配置。",
  "只输出一个 JSON 对象，不要输出任何解释或 markdown 代码块。JSON 字段固定为：",
  '{"title":"图表标题（中文，简洁）",',
  '"chartType":"scatter、line、bar、heatmap 之一",',
  '"option":{标准 ECharts option},',
  '"insight":"3-5 句中文解读，说明趋势、相关性或异常点并给出结论建议"}',
  "硬性要求：",
  "1. option 必须包含 series 数组，且 series[].data 内联真实数据，禁止使用 dataset 引用、函数或未定义的变量。",
  "2. 数值轴 type 用 \"value\"；时间型字段可用 type \"time\"，其余分类型用 \"category\" 且 xAxis.data 给出类目数组。",
  "3. 数据点控制在 200 个以内，超出时按等间隔抽样。",
  "4. 坐标轴名称、图例使用中文。",
  "5. insight 必须结合真实数值（相关系数、最大/最小值、趋势方向）解读，不要空泛描述。",
].join("\n");

const RECOMMEND_SYSTEM_PROMPT = [
  "你是融研AI的数据可视化专家。请根据提供的字段定义、统计信息与数据样本，从散点图、折线图、柱状图、热力图中推荐最合适的一种，并生成可直接被 ECharts 渲染的配置。",
  "只输出一个 JSON 对象，不要输出任何解释或 markdown 代码块。JSON 字段固定为：",
  '{"title":"图表标题（中文）",',
  '"chartType":"scatter、line、bar、heatmap 之一",',
  '"option":{标准 ECharts option},',
  '"insight":"先用一句话说明为什么选择该图表类型，再给出 2-3 句数据解读"}',
  "硬性要求：",
  "1. option 必须包含 series 数组，且 series[].data 内联真实数据，禁止使用 dataset 引用、函数或未定义的变量。",
  "2. 数据点控制在 200 个以内，超出时按等间隔抽样。",
  "3. 坐标轴名称、图例使用中文。",
].join("\n");

function normalizeChartType(value: unknown, option: Record<string, unknown>): string {
  const allowed = ALLOWED_CHART_TYPES as readonly string[];
  if (typeof value === "string" && allowed.includes(value)) return value;
  const series = option.series;
  if (Array.isArray(series) && series.length > 0) {
    const first = series[0] as { type?: unknown };
    if (typeof first?.type === "string" && allowed.includes(first.type)) {
      return first.type;
    }
  }
  return "bar";
}

/** 校验并归一化模型返回的 ECharts option */
export function normalizeChartOption(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const option = raw as Record<string, unknown>;
  if (!Array.isArray(option.series) || option.series.length === 0) return null;
  return option;
}

async function runDataGenerate(params: {
  userId: string;
  system: string;
  prompt: string;
}) {
  const { userId, system, prompt } = params;
  const { model, modelId, provider, mock } = await getChatModel("light");

  const result = await generateText({ model, system, prompt, temperature: 0.2 });

  try {
    const inputTokens = result.usage.inputTokens ?? 0;
    const outputTokens = result.usage.outputTokens ?? 0;
    await prisma.aiUsageLog.create({
      data: {
        userId,
        tier: "light",
        scenario: "data",
        provider,
        model: modelId,
        inputTokens,
        outputTokens,
        totalTokens: result.usage.totalTokens ?? inputTokens + outputTokens,
        mock,
      },
    });
  } catch (error) {
    console.error("[data] 写入 AiUsageLog 失败:", error);
  }

  return result.text;
}

/**
 * 生成图表配置。
 * mode = "prompt"：按用户自然语言需求出图；
 * mode = "recommend"：由 AI 综合字段与统计推荐图表类型。
 */
export async function generateChart(
  userId: string,
  params: {
    name: string;
    headers: string[];
    columns: ColumnMeta[];
    rows: CellValue[][];
    prompt?: string;
    mode: "prompt" | "recommend";
  }
): Promise<GeneratedChart> {
  const { name, headers, columns, rows, prompt, mode } = params;
  const context = buildSchemaContext({ name, headers, columns, rows });
  const requirement =
    mode === "recommend"
      ? "请综合以上字段与统计信息，推荐最合适的一种图表类型并出图。"
      : (prompt ?? "").trim() || "请选择最能体现数据特征的图表并出图。";

  const fullPrompt = `${context}\n${requirement}`.slice(0, MAX_CONTEXT_CHARS);
  const text = await runDataGenerate({
    userId,
    system: mode === "recommend" ? RECOMMEND_SYSTEM_PROMPT : CHART_SYSTEM_PROMPT,
    prompt: fullPrompt,
  });

  const parsed = extractJson<{
    title?: unknown;
    chartType?: unknown;
    option?: unknown;
    insight?: unknown;
  }>(text);

  if (!parsed) {
    throw new Error("AI 未返回可解析的图表配置，请重试或换个说法描述需求");
  }
  const option = normalizeChartOption(parsed.option);
  if (!option) {
    throw new Error("AI 返回的图表配置缺少 series 数据，请重试");
  }

  return {
    title:
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim().slice(0, 80)
        : "分析图表",
    chartType: normalizeChartType(parsed.chartType, option),
    option,
    insight: typeof parsed.insight === "string" ? parsed.insight.trim() : "",
  };
}
