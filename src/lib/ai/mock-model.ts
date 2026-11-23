import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import type { LanguageModelV4CallOptions } from "@ai-sdk/provider";

// 本地 Mock 语言模型：未配置 LLM_API_KEY（或显式 LLM_MOCK=true）时启用。
// 实现 LanguageModelV4 接口，输出可观测的流式分块与确定性 Token 用量，
// 让 /api/chat 在无外网、无密钥的环境下也能完整跑通流式链路与用量落库。

/** 从模型调用参数中提取最后一条用户消息的文本 */
function extractLastUserText(options: LanguageModelV4CallOptions): string {
  const prompt = options.prompt ?? [];
  for (let i = prompt.length - 1; i >= 0; i--) {
    const message = prompt[i];
    if (message.role !== "user") continue;
    const parts = Array.isArray(message.content) ? message.content : [];
    const text = parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { text: string }).text)
      .join("")
      .trim();
    if (text) return text;
  }
  return "";
}

/** 粗估 Token 数：中文按字符数计，英文按词数计，取两者折中，至少为 1 */
function estimateTokens(text: string): number {
  if (!text) return 1;
  const cjkChars = (text.match(/[一-鿿]/g) ?? []).length;
  const words = (text.replace(/[一-鿿]/g, " ").match(/[A-Za-z0-9]+/g) ?? [])
    .length;
  return Math.max(1, Math.ceil(cjkChars + words));
}

/** 构造 Mock 回复文本 */
function buildMockReply(userText: string, modelId: string): string {
  const preview = userText.length > 60 ? userText.slice(0, 60) + "…" : userText;
  return [
    `【融研AI · 本地 Mock 模型 ${modelId}】`,
    `我已收到你的问题：“${preview || "（空消息）"}”。`,
    "当前环境未配置真实大模型 API Key，本回复由内置 Mock 模型生成，",
    "用于验证流式对话链路（SSE 分块输出）与 Token 用量记录是否正常。",
    "在 .env 中填入 LLM_API_KEY 后，将自动切换为 DeepSeek / 通义千问等云端模型。",
  ].join("");
}

/** 读取系统提示文本 */
function getSystemPrompt(options: LanguageModelV4CallOptions): string {
  return (options.prompt ?? [])
    .filter((message) => message.role === "system")
    .map((message) => (typeof message.content === "string" ? message.content : ""))
    .join("\n");
}

/** 检测系统提示是否要求「仅输出 JSON」（结构化抽取场景） */
function requestsJsonOnly(options: LanguageModelV4CallOptions): boolean {
  return getSystemPrompt(options).includes("JSON");
}

/** 复习助手：错题结构化抽取的确定性 Mock JSON */
function buildReviewJsonReply(): string {
  return JSON.stringify({
    subject: "模拟学科",
    knowledgePoints: ["模拟知识点一", "模拟知识点二"],
    formulas: ["F = ma", "E = mc^2"],
    summary: "这是 Mock 模型生成的解题思路摘要。",
  });
}

/** 文献助手：三分钟速读卡的确定性 Mock JSON */
function buildPaperSummaryJsonReply(): string {
  return JSON.stringify({
    background: "Mock 速读卡：该研究针对领域内现有方法的效率瓶颈展开，旨在提出更轻量的解决方案。",
    methods: "Mock 速读卡：作者采用注意力机制与对照实验设计，在公开基准数据集上进行消融与对比验证。",
    results: "Mock 速读卡：实验表明新方法在核心指标上优于基线，同时推理延迟与显存占用均有下降。",
    limitations: "Mock 速读卡：训练数据规模有限，跨领域泛化能力与真实场景鲁棒性仍需进一步验证。",
  });
}

/** 翻译场景 Mock：返回带目标语言标记的确定性译文 */
function buildTranslationReply(systemPrompt: string, userText: string): string {
  const toEnglish = systemPrompt.includes("英文") || systemPrompt.includes("English");
  if (toEnglish) {
    return (
      "[Mock English translation] This is a deterministic translation produced by the local mock model. Original content: " +
      userText.slice(0, 120)
    );
  }
  return (
    "【Mock 中文译文】这是本地 Mock 模型生成的确定性中文译文，原文要点：" +
    userText.slice(0, 120)
  );
}

/** 溯源问答 Mock：基于上下文中出现的段落编号，输出带 [段落 N] 引用的回答 */
function buildCitationReply(fullPrompt: string, userText: string): string {
  const paragraphNumbers = Array.from(
    new Set(
      (fullPrompt.match(/\[段落\s*(\d+)\]/g) ?? []).map((token) =>
        Number(token.match(/\d+/)?.[0] ?? "1")
      )
    )
  ).sort((a, b) => a - b);

  const cited = paragraphNumbers.slice(0, 2);
  const refs = cited.length > 0 ? cited : [1, 2];
  const preview = userText.length > 40 ? userText.slice(0, 40) + "…" : userText;
  return [
    `【Mock 溯源回答】关于“${preview || "你的问题"}”，根据原文内容：`,
    `首先，文献在相关段落中给出了背景与动机说明 [段落 ${refs[0]}]；`,
    `其次，关键方法与实验证据可在后续段落中找到对应表述 [段落 ${refs[1] ?? refs[0]}]。`,
    "以上结论均来自原文标注段落，点击引用标签可在左侧查看对应原文。",
  ].join("");
}

// ===== 数据洞察：ECharts option 的确定性 Mock 生成 =====

interface MockColumnMeta {
  name: string;
  type: string;
}

interface MockChartParts {
  columns: MockColumnMeta[];
  header: string[];
  rows: unknown[][];
  requirement: string;
}

/** 从上下文中解析出列定义、表头、数据行与需求（格式由 data-service 约定） */
function extractChartParts(fullPrompt: string): MockChartParts | null {
  const columnMatch = fullPrompt.match(/【列定义】\s*\n(\[[^\n]*\])/);
  const sampleMatch = fullPrompt.match(/【数据样本】\s*\n(\[[^\n]*\])/);
  if (!columnMatch || !sampleMatch) return null;
  let columns: MockColumnMeta[];
  let sample: unknown[][];
  try {
    columns = JSON.parse(columnMatch[1]) as MockColumnMeta[];
    sample = JSON.parse(sampleMatch[1]) as unknown[][];
  } catch {
    return null;
  }
  if (!Array.isArray(columns) || !Array.isArray(sample) || sample.length < 2) {
    return null;
  }
  const header = (sample[0] ?? []).map((value) => String(value));
  const requirementMatch = fullPrompt.match(/【需求】\s*\n([\s\S]*)$/);
  return {
    columns,
    header,
    rows: sample.slice(1),
    requirement: requirementMatch ? requirementMatch[1].trim() : "",
  };
}

function cellToNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** 等间隔抽样，返回保留的行下标 */
function pickIndexes(length: number, max = 200): number[] {
  if (length <= max) return Array.from({ length }, (_, index) => index);
  const step = length / max;
  const indexes: number[] = [];
  for (let i = 0; i < max; i += 1) indexes.push(Math.floor(i * step));
  return indexes;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** 皮尔逊相关系数（样本不足或方差为 0 时返回 null） */
function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const meanX = xs.reduce((sum, v) => sum + v, 0) / n;
  const meanY = ys.reduce((sum, v) => sum + v, 0) / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) return null;
  return cov / Math.sqrt(varX * varY);
}

/** 数据洞察场景的确定性 Mock：依据真实样本数据拼装 ECharts option */
function buildChartReply(fullPrompt: string): string {
  const parts = extractChartParts(fullPrompt);
  if (!parts) {
    return JSON.stringify({
      title: "示例图表",
      chartType: "bar",
      option: {
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: ["A", "B", "C"] },
        yAxis: { type: "value" },
        series: [{ type: "bar", data: [3, 5, 2] }],
      },
      insight: "Mock 解读：未在上下文中解析到数据样本，返回占位图表。",
    });
  }

  const { columns, header, rows, requirement } = parts;
  const numericIndexes = columns
    .map((column, index) => ({ index, name: column.name }))
    .filter((item) => item.name && columns[item.index]?.type === "number");
  const dateIndexes = columns
    .map((column, index) => ({ index, name: column.name }))
    .filter((item) => columns[item.index]?.type === "date");
  const categoryIndexes = columns
    .map((column, index) => ({ index, name: column.name }))
    .filter((item) => columns[item.index]?.type === "category");
  const rowIndexes = pickIndexes(rows.length);

  let chartType: string;
  if (/散点|相关性|scatter/.test(requirement)) chartType = "scatter";
  else if (/热力|矩阵|heatmap/.test(requirement)) chartType = "heatmap";
  else if (/折线|趋势|走向|line/.test(requirement)) chartType = "line";
  else if (/柱|对比|分布|占比|bar/.test(requirement)) chartType = "bar";
  else if (numericIndexes.length >= 2) chartType = "scatter";
  else if (dateIndexes.length >= 1 && numericIndexes.length >= 1) chartType = "line";
  else if (categoryIndexes.length >= 1 && numericIndexes.length >= 1) chartType = "bar";
  else if (numericIndexes.length >= 1) chartType = "line";
  else chartType = "bar";

  let option: Record<string, unknown>;
  let title: string;
  let insight: string;

  if (chartType === "scatter" && numericIndexes.length >= 1) {
    const xi = numericIndexes[0].index;
    const yi = numericIndexes[1]?.index ?? numericIndexes[0].index;
    const points: number[][] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (const rowIndex of rowIndexes) {
      const x = cellToNumber(rows[rowIndex]?.[xi]);
      const y = cellToNumber(rows[rowIndex]?.[yi]);
      if (x === null || y === null) continue;
      points.push([x, y]);
      xs.push(x);
      ys.push(y);
    }
    const r = pearson(xs, ys);
    option = {
      tooltip: { trigger: "item" },
      grid: { left: 60, right: 30, top: 50, bottom: 60 },
      xAxis: { type: "value", name: header[xi] ?? "" },
      yAxis: { type: "value", name: header[yi] ?? "" },
      series: [
        {
          type: "scatter",
          name: `${header[yi] ?? ""} - ${header[xi] ?? ""}`,
          symbolSize: 9,
          data: points,
        },
      ],
    };
    title = `${header[xi] ?? "X"} 与 ${header[yi] ?? "Y"} 散点图`;
    insight = [
      `Mock 解读：共 ${points.length} 个有效样本，横轴为「${header[xi]}」，纵轴为「${header[yi]}」。`,
      r === null
        ? "样本方差不足，暂无法给出相关系数。"
        : `皮尔逊相关系数 r = ${round(r, 4)}，${
            Math.abs(r) >= 0.7
              ? "二者呈现强线性相关"
              : Math.abs(r) >= 0.4
                ? "二者呈现中等强度相关"
                : "二者线性相关较弱"
          }（${r > 0 ? "正相关" : "负相关"}）。`,
      xs.length > 0
        ? `横轴取值范围 ${round(Math.min(...xs))} ~ ${round(Math.max(...xs))}，纵轴取值范围 ${round(Math.min(...ys))} ~ ${round(Math.max(...ys))}。`
        : "",
    ]
      .filter(Boolean)
      .join("");
  } else if (chartType === "bar") {
    const categoryIndex =
      categoryIndexes[0]?.index ??
      (numericIndexes.length > 0 ? -1 : 0);
    const valueIndex = numericIndexes[0]?.index ?? -1;
    const labels: string[] = [];
    const values: number[] = [];
    if (categoryIndex >= 0 && valueIndex >= 0) {
      const buckets = new Map<string, { sum: number; count: number }>();
      for (const rowIndex of rowIndexes) {
        const key = rows[rowIndex]?.[categoryIndex];
        const value = cellToNumber(rows[rowIndex]?.[valueIndex]);
        if (key === null || key === undefined || value === null) continue;
        const name = String(key);
        const bucket = buckets.get(name) ?? { sum: 0, count: 0 };
        bucket.sum += value;
        bucket.count += 1;
        buckets.set(name, bucket);
      }
      for (const [name, bucket] of Array.from(buckets.entries()).slice(0, 20)) {
        labels.push(name);
        values.push(round(bucket.sum / bucket.count));
      }
    } else {
      const counter = new Map<string, number>();
      for (const rowIndex of rowIndexes) {
        const key = rows[rowIndex]?.[categoryIndex >= 0 ? categoryIndex : 0];
        if (key === null || key === undefined) continue;
        const name = String(key);
        counter.set(name, (counter.get(name) ?? 0) + 1);
      }
      for (const [name, count] of Array.from(counter.entries()).slice(0, 20)) {
        labels.push(name);
        values.push(count);
      }
    }
    const valueName =
      valueIndex >= 0 ? `${header[valueIndex] ?? "数值"}均值` : "记录数";
    option = {
      tooltip: { trigger: "axis" },
      grid: { left: 60, right: 30, top: 50, bottom: 70 },
      xAxis: { type: "category", data: labels, axisLabel: { rotate: labels.length > 6 ? 30 : 0 } },
      yAxis: { type: "value", name: valueName },
      series: [{ type: "bar", name: valueName, data: values }],
    };
    title = `${header[categoryIndex >= 0 ? categoryIndex : 0] ?? "分类"} ${valueName} 柱状图`;
    insight = `Mock 解读：按「${header[categoryIndex >= 0 ? categoryIndex : 0] ?? "分类"}」聚合后共 ${labels.length} 个类目，${
      values.length > 0 ? `最大值为 ${Math.max(...values)}，最小值为 ${Math.min(...values)}。` : ""
    }`;
  } else if (chartType === "heatmap" && numericIndexes.length >= 2) {
    const xi = numericIndexes[0];
    const yi = numericIndexes[1];
    const xs: number[] = [];
    const ys: number[] = [];
    for (const rowIndex of rowIndexes) {
      const x = cellToNumber(rows[rowIndex]?.[xi.index]);
      const y = cellToNumber(rows[rowIndex]?.[yi.index]);
      if (x === null || y === null) continue;
      xs.push(x);
      ys.push(y);
    }
    const bins = 6;
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const spanX = xMax - xMin || 1;
    const spanY = yMax - yMin || 1;
    const xLabels = Array.from({ length: bins }, (_, i) =>
      round(xMin + (spanX * (i + 0.5)) / bins, 2)
    );
    const yLabels = Array.from({ length: bins }, (_, i) =>
      round(yMin + (spanY * (i + 0.5)) / bins, 2)
    );
    const grid = Array.from({ length: bins * bins }, () => 0);
    for (let i = 0; i < xs.length; i += 1) {
      const bx = Math.min(bins - 1, Math.floor(((xs[i] - xMin) / spanX) * bins));
      const by = Math.min(bins - 1, Math.floor(((ys[i] - yMin) / spanY) * bins));
      grid[by * bins + bx] += 1;
    }
    const data: number[][] = [];
    for (let by = 0; by < bins; by += 1) {
      for (let bx = 0; bx < bins; bx += 1) {
        data.push([bx, by, grid[by * bins + bx]]);
      }
    }
    option = {
      tooltip: { position: "top" },
      grid: { left: 70, right: 30, top: 40, bottom: 60 },
      xAxis: { type: "category", data: xLabels, name: xi.name },
      yAxis: { type: "category", data: yLabels, name: yi.name },
      visualMap: {
        min: 0,
        max: Math.max(...grid),
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 10,
      },
      series: [{ type: "heatmap", data, label: { show: false } }],
    };
    title = `${xi.name} × ${yi.name} 密度热力图`;
    insight = `Mock 解读：将「${xi.name}」与「${yi.name}」各自等宽分箱后统计样本频次，共 ${xs.length} 个有效样本，最密集区域频次为 ${Math.max(...grid)}。`;
  } else {
    const yi = numericIndexes[0]?.index ?? -1;
    const xIndex = dateIndexes[0]?.index ?? -1;
    const labels: string[] = [];
    const values: number[] = [];
    for (const rowIndex of rowIndexes) {
      const label =
        xIndex >= 0
          ? String(rows[rowIndex]?.[xIndex] ?? "")
          : String(rowIndex + 1);
      const value = yi >= 0 ? cellToNumber(rows[rowIndex]?.[yi]) : null;
      if (value === null) continue;
      labels.push(label);
      values.push(value);
    }
    option = {
      tooltip: { trigger: "axis" },
      grid: { left: 60, right: 30, top: 50, bottom: 70 },
      xAxis: { type: "category", data: labels, axisLabel: { rotate: labels.length > 6 ? 30 : 0 } },
      yAxis: { type: "value", name: yi >= 0 ? header[yi] : "" },
      series: [
        { type: "line", smooth: true, name: yi >= 0 ? header[yi] : "数值", data: values },
      ],
    };
    chartType = "line";
    title = `${xIndex >= 0 ? header[xIndex] : "序号"} - ${yi >= 0 ? header[yi] : "数值"} 趋势折线图`;
    insight = `Mock 解读：共 ${values.length} 个有效数据点，${
      values.length > 0
        ? `数值范围 ${round(Math.min(...values))} ~ ${round(Math.max(...values))}，均值 ${round(values.reduce((s, v) => s + v, 0) / values.length)}。`
        : ""
    }`;
  }

  return JSON.stringify({ title, chartType, option, insight });
}

/** 实验台账：实验归纳的确定性 Mock JSON */
function buildExperimentSummaryReply(): string {
  return JSON.stringify({
    summary: "Mock 实验总结：本次实验验证了预设的实验假设，各项参数调整符合预期，实验现象稳定，结论与理论推导基本一致。",
    highlights: ["成功复现了目标实验现象", "参数调节精度达到预期要求", "结论与理论模型吻合度超过90%"],
    anomalies: ["第3组实验数据出现约5%的偏差，可能由环境温度波动导致"],
  });
}

/** 实验台账：组会周报的确定性 Mock JSON */
function buildWeeklyReportReply(): string {
  const markdown = `# 组会周报（2026-11-17 ~ 2026-11-23）

## 本周进展
1. 完成了3组核心实验，验证了算法在不同参数下的稳定性
2. 优化了实验流程，单次实验时间缩短了20%
3. 累计采集有效数据样本120组，数据质量符合后续分析要求

## 遇到的问题
1. 极端参数下实验重现性较差，需进一步排查环境干扰因素
2. 部分样本采集时出现异常波动，可能与硬件设备稳定性有关

## 下周计划
1. 完成剩余2组对照实验，形成完整的实验结论
2. 排查环境干扰因素，优化实验环境控制方案
3. 整理实验数据，撰写论文初稿的实验部分
`;

  return JSON.stringify({
    progress: [
      "完成3组核心实验，验证算法稳定性",
      "优化实验流程，效率提升20%",
      "采集有效数据样本120组"
    ],
    problems: [
      "极端参数下实验重现性较差",
      "部分样本采集出现异常波动"
    ],
    plans: [
      "完成剩余2组对照实验",
      "排查环境干扰因素",
      "整理数据撰写论文初稿"
    ],
    markdown
  });
}

/** 根据调用场景选择普通文本或结构化 JSON 回复 */
function buildReply(
  options: LanguageModelV4CallOptions,
  userText: string,
  modelId: string
): string {
  const systemPrompt = getSystemPrompt(options);
  const fullPrompt = (options.prompt ?? [])
    .map((message) =>
      Array.isArray(message.content)
        ? message.content.map((part) => ("text" in part ? part.text : "")).join("")
        : typeof message.content === "string"
          ? message.content
          : ""
    )
    .join("\n");

  // 数据洞察：ECharts option 生成 / 推荐
  if (systemPrompt.includes("ECharts")) {
    return buildChartReply(fullPrompt);
  }
  // 文献速读卡（要求 JSON 且含「研究背景」标记）
  if (requestsJsonOnly(options) && systemPrompt.includes("研究背景")) {
    return buildPaperSummaryJsonReply();
  }
  // 实验归纳场景
  if (requestsJsonOnly(options) && systemPrompt.includes("实验总结")) {
    return buildExperimentSummaryReply();
  }
  // 组会周报场景
  if (requestsJsonOnly(options) && systemPrompt.includes("组会周报")) {
    return buildWeeklyReportReply();
  }
  // 复习错题抽取（其他 JSON-only 场景保持原行为）
  if (requestsJsonOnly(options)) {
    return buildReviewJsonReply();
  }
  // 翻译场景
  if (systemPrompt.includes("翻译")) {
    return buildTranslationReply(systemPrompt, userText);
  }
  // 溯源问答场景
  if (systemPrompt.includes("段落") && systemPrompt.includes("引用")) {
    return buildCitationReply(fullPrompt, userText);
  }
  return buildMockReply(userText, modelId);
}

/** 把文本切成小块，模拟真实模型的逐字流式输出 */
function splitIntoChunks(text: string, size = 8): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export function createMockModel(modelId: string): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: "mock",
    modelId,
    doStream: async (options: LanguageModelV4CallOptions) => {
      const userText = extractLastUserText(options);
      const reply = buildReply(options, userText, modelId);
      const textId = "mock-text-1";

      // 汇总输入文本（含系统消息与历史消息），用于估算输入 Token
      const allInputText = (options.prompt ?? [])
        .map((message) =>
          Array.isArray(message.content)
            ? message.content
                .filter((part) => part.type === "text")
                .map((part) => (part as { text: string }).text)
                .join("")
            : typeof message.content === "string"
              ? message.content
              : ""
        )
        .join("");
      const inputTokens = estimateTokens(allInputText);
      const outputTokens = estimateTokens(reply);

      const chunks = [
        { type: "stream-start" as const, warnings: [] },
        { type: "text-start" as const, id: textId },
        ...splitIntoChunks(reply).map((delta) => ({
          type: "text-delta" as const,
          id: textId,
          delta,
        })),
        { type: "text-end" as const, id: textId },
        {
          type: "finish" as const,
          finishReason: { unified: "stop" as const, raw: undefined },
          usage: {
            inputTokens: {
              total: inputTokens,
              noCache: inputTokens,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: {
              total: outputTokens,
              text: outputTokens,
              reasoning: undefined,
            },
          },
        },
      ];

      return {
        stream: simulateReadableStream({
          chunks,
          initialDelayInMs: 0,
          chunkDelayInMs: 20, // 每个分块间隔 20ms，便于观察真实流式效果
        }),
      };
    },
    doGenerate: async (options: LanguageModelV4CallOptions) => {
      const userText = extractLastUserText(options);
      const reply = buildReply(options, userText, modelId);
      const inputTokens = estimateTokens(userText);
      const outputTokens = estimateTokens(reply);
      return {
        content: [{ type: "text" as const, text: reply }],
        finishReason: { unified: "stop" as const, raw: undefined },
        usage: {
          inputTokens: {
            total: inputTokens,
            noCache: inputTokens,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: {
            total: outputTokens,
            text: outputTokens,
            reasoning: undefined,
          },
        },
        warnings: [],
      };
    },
  });
}
