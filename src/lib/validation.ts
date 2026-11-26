import { BadRequestError } from "./errors";

// 通用校验工具
export function validateRequired<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new BadRequestError(`${fieldName} 不能为空`);
  }
  return value;
}

export function validateString(value: unknown, fieldName: string, minLength = 0, maxLength?: number): string {
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} 必须是字符串`);
  }
  if (value.length < minLength) {
    throw new BadRequestError(`${fieldName} 最少需要 ${minLength} 个字符`);
  }
  if (maxLength !== undefined && value.length > maxLength) {
    throw new BadRequestError(`${fieldName} 最多允许 ${maxLength} 个字符`);
  }
  return value;
}

export function validateNumber(value: unknown, fieldName: string, min?: number, max?: number): number {
  if (typeof value !== "number" || isNaN(value)) {
    throw new BadRequestError(`${fieldName} 必须是数字`);
  }
  if (min !== undefined && value < min) {
    throw new BadRequestError(`${fieldName} 不能小于 ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new BadRequestError(`${fieldName} 不能大于 ${max}`);
  }
  return value;
}

export function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new BadRequestError(`${fieldName} 必须是布尔值`);
  }
  return value;
}

export function validateArray<T>(value: unknown, fieldName: string, itemValidator?: (item: unknown, index: number) => T): T[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${fieldName} 必须是数组`);
  }
  if (itemValidator) {
    return value.map((item, index) => itemValidator(item, index));
  }
  return value as T[];
}

export function validateEnum<T extends string>(value: unknown, fieldName: string, allowedValues: T[]): T {
  if (!allowedValues.includes(value as T)) {
    throw new BadRequestError(`${fieldName} 仅允许值: ${allowedValues.join(", ")}`);
  }
  return value as T;
}

export function validateEmail(value: unknown, fieldName = "邮箱"): string {
  const email = validateString(value, fieldName);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new BadRequestError(`${fieldName} 格式不正确`);
  }
  return email;
}

export function validateUrl(value: unknown, fieldName = "URL"): string {
  const url = validateString(value, fieldName);
  try {
    new URL(url);
    return url;
  } catch {
    throw new BadRequestError(`${fieldName} 格式不正确`);
  }
}

// 类型守卫
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// JSON 解析校验
export function parseJsonSafe<T = unknown>(value: string, fieldName: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new BadRequestError(`${fieldName} 不是合法的 JSON 格式`);
  }
}
