import { prisma } from "@/lib/prisma";
import { TooManyRequestsError, ForbiddenError } from "@/lib/errors";
import type { ScenarioKey } from "./models";

// 配额配置（单位：Token / 每天）
const QUOTA_CONFIG = {
  // 默认免费用户配额
  default: 100000,
  // 各场景单独配额限制（可选）
  scenarios: {
    review: 30000,
    papers: 20000,
    data: 20000,
    experiments: 15000,
    lab: 25000,
    jobs: 20000,
  } as Partial<Record<ScenarioKey, number>>,
} as const;

// 速率限制配置（每分钟最多请求数）
const RATE_LIMIT_CONFIG = {
  requestsPerMinute: 30,
} as const;

interface UsageCheckResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

/**
 * 检查用户速率限制
 * @param userId 用户ID
 * @returns 检查结果
 */
export async function checkRateLimit(userId: string): Promise<UsageCheckResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 1000); // 1分钟窗口

  // 统计最近1分钟内的请求数
  const requestCount = await prisma.aiUsageLog.count({
    where: {
      userId,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (requestCount >= RATE_LIMIT_CONFIG.requestsPerMinute) {
    throw new TooManyRequestsError(`请求过于频繁，每分钟最多允许 ${RATE_LIMIT_CONFIG.requestsPerMinute} 次请求`);
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.requestsPerMinute - requestCount - 1,
    resetTime: new Date(windowStart.getTime() + 60 * 1000),
  };
}

/**
 * 检查用户日配额
 * @param userId 用户ID
 * @param scenario 使用场景
 * @returns 检查结果
 */
export async function checkQuota(userId: string, scenario: ScenarioKey): Promise<UsageCheckResult> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // 统计今日已使用Token总量
  const totalUsage = await prisma.aiUsageLog.aggregate({
    where: {
      userId,
      createdAt: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
  });

  const totalUsed = (totalUsage._sum.inputTokens ?? 0) + (totalUsage._sum.outputTokens ?? 0);
  const totalQuota = QUOTA_CONFIG.default;

  if (totalUsed >= totalQuota) {
    throw new ForbiddenError(`今日AI使用配额已用完（${totalQuota} Token），请明天再试或升级账户`);
  }

  // 检查场景级配额（如果有配置）
  const scenarioQuota = QUOTA_CONFIG.scenarios[scenario];
  if (scenarioQuota) {
    const scenarioUsage = await prisma.aiUsageLog.aggregate({
      where: {
        userId,
        scenario,
        createdAt: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
    });

    const scenarioUsed = (scenarioUsage._sum.inputTokens ?? 0) + (scenarioUsage._sum.outputTokens ?? 0);
    if (scenarioUsed >= scenarioQuota) {
      throw new ForbiddenError(`今日${scenario}场景使用配额已用完（${scenarioQuota} Token），请明天再试`);
    }
  }

  return {
    allowed: true,
    remaining: totalQuota - totalUsed,
    resetTime: dayEnd,
  };
}

/**
 * 记录AI使用日志
 * @param userId 用户ID
 * @param scenario 使用场景
 * @param modelId 模型ID
 * @param provider 提供商
 * @param inputTokens 输入Token数
 * @param outputTokens 输出Token数
 * @param cost 成本（可选，单位：分）
 * @param success 是否成功
 * @param errorMessage 错误信息（可选）
 */
export async function logUsage(
  userId: string,
  scenario: ScenarioKey,
  modelId: string,
  provider: string,
  tier: "light" | "strong",
  inputTokens: number,
  outputTokens: number,
  cost?: number,
  success = true,
  errorMessage?: string
) {
  try {
    await prisma.aiUsageLog.create({
      data: {
        userId,
        scenario,
        tier,
        model: modelId,
        provider,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    });
  } catch (error) {
    console.error("Failed to log AI usage:", error);
    // 日志写入失败不影响主流程
  }
}

/**
 * 统一AI调用入口
 * 1. 检查速率限制
 * 2. 检查配额
 * 3. 执行模型调用
 * 4. 记录使用日志
 */
export async function withAIGate<T>(
  userId: string,
  scenario: ScenarioKey,
  tier: "light" | "strong",
  handler: () => Promise<{
    inputTokens: number;
    outputTokens: number;
    modelId: string;
    provider: string;
    result: T;
  }>
): Promise<T> {
  // 1. 检查速率限制
  await checkRateLimit(userId);

  // 2. 检查配额
  await checkQuota(userId, scenario);

  let inputTokens = 0;
  let outputTokens = 0;
  let modelId = "";
  let provider = "";
  let success = false;
  let errorMessage: string | undefined;

  try {
    // 3. 执行模型调用
    const result = await handler();
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;
    modelId = result.modelId;
    provider = result.provider;
    success = true;
    return result.result;
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    // 4. 记录使用日志（无论成功失败）
    if (userId && scenario) {
      await logUsage(
        userId,
        scenario,
        modelId,
        provider,
        tier,
        inputTokens,
        outputTokens,
        undefined,
        success,
        errorMessage
      );
    }
  }
}
