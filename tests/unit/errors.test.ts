import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  InternalServerError,
  formatErrorResponse,
  withErrorHandler,
} from "@/lib/errors";

describe("errors 统一错误框架", () => {
  it("各业务错误类携带正确的 HTTP 状态码", () => {
    expect(new BadRequestError().statusCode).toBe(400);
    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new NotFoundError().statusCode).toBe(404);
    expect(new TooManyRequestsError().statusCode).toBe(429);
    expect(new InternalServerError().statusCode).toBe(500);
  });

  it("AppError 支持自定义消息且默认可操作错误", () => {
    const error = new BadRequestError("自定义错误信息");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("自定义错误信息");
    expect(error.isOperational).toBe(true);
  });

  it("InternalServerError 标记为非业务可操作错误", () => {
    expect(new InternalServerError().isOperational).toBe(false);
  });

  describe("formatErrorResponse", () => {
    it("对 AppError 返回结构化错误体", () => {
      const formatted = formatErrorResponse(new NotFoundError("资源不存在"));
      expect(formatted).toEqual({
        error: "资源不存在",
        code: "NotFoundError",
        statusCode: 404,
      });
    });

    it("开发环境下未知错误返回原始消息", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";
      const formatted = formatErrorResponse(new Error("意外崩溃"));
      expect(formatted.statusCode).toBe(500);
      expect(formatted.code).toBe("InternalServerError");
      expect(formatted.error).toBe("意外崩溃");
      process.env.NODE_ENV = originalEnv;
    });

    it("生产环境下未知错误隐藏内部细节", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      const formatted = formatErrorResponse(new Error("敏感堆栈信息"));
      expect(formatted.error).toBe("服务器内部错误");
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("withErrorHandler", () => {
    it("正常返回 handler 的 Response", async () => {
      const handler = withErrorHandler(async () => Response.json({ ok: true }));
      const response = await handler(new Request("http://localhost/"));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true });
    });

    it("捕获 AppError 并转换为对应 HTTP 响应", async () => {
      const handler = withErrorHandler(async () => {
        throw new ForbiddenError("禁止访问");
      });
      const response = await handler(new Request("http://localhost/"));
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({
        error: "禁止访问",
        code: "ForbiddenError",
      });
    });

    it("未知异常统一兜底为 500", async () => {
      const handler = withErrorHandler(async () => {
        throw new Error("boom");
      });
      const response = await handler(new Request("http://localhost/"));
      expect(response.status).toBe(500);
    });
  });
});
