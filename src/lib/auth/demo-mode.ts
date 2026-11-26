import { ForbiddenError } from "@/lib/errors";
import type { User } from "@prisma/client";

// 演示用户邮箱
export const DEMO_USER_EMAIL = "demo@rongyan.ai";

/**
 * 检查是否为演示用户
 */
export function isDemoUser(user: { email?: string } | null | undefined): boolean {
  return user?.email === DEMO_USER_EMAIL;
}

/**
 * 校验演示用户权限，禁止演示用户进行破坏性操作
 * @param user 当前用户
 * @param action 操作描述（用于错误提示）
 */
export function validateDemoUserPermission(user: { email?: string } | null | undefined, action = "该操作") {
  if (isDemoUser(user)) {
    throw new ForbiddenError(`演示账户禁止${action}，如需完整功能请注册正式账户`);
  }
}

/**
 * 演示用户允许的安全操作列表（HTTP方法）
 */
export const DEMO_SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/**
 * 校验演示用户的HTTP方法权限
 */
export function validateDemoMethodPermission(user: { email?: string } | null | undefined, method: string) {
  if (isDemoUser(user) && !DEMO_SAFE_METHODS.includes(method.toUpperCase())) {
    throw new ForbiddenError("演示账户禁止修改数据，如需完整功能请注册正式账户");
  }
}