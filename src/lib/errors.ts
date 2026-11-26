// 统一错误类定义
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 系列错误
export class BadRequestError extends AppError {
  constructor(message = "请求参数错误") {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "未登录或登录已过期") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "无权执行此操作") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "资源不存在或无权访问") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "资源已存在") {
    super(message, 409);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "请求内容过大") {
    super(message, 413);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = "不支持的媒体类型") {
    super(message, 415);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = "请求格式正确但内容无法处理") {
    super(message, 422);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "请求过于频繁，请稍后再试") {
    super(message, 429);
  }
}

// 500 系列错误
export class InternalServerError extends AppError {
  constructor(message = "服务器内部错误") {
    super(message, 500, false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "服务暂时不可用") {
    super(message, 503);
  }
}

// 错误响应格式化
export function formatErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.constructor.name,
      statusCode: error.statusCode,
    };
  }

  console.error("Unexpected error:", error);
  return {
    error: process.env.NODE_ENV === "production" ? "服务器内部错误" : (error as Error)?.message || "未知错误",
    code: "InternalServerError",
    statusCode: 500,
  };
}

// API 路由包装器，统一处理错误
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      const formatted = formatErrorResponse(error);
      return Response.json(formatted, { status: formatted.statusCode });
    }
  }) as T;
}
