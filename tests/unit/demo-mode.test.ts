import { isDemoUser, validateDemoUserPermission, DEMO_SAFE_METHODS } from "@/lib/auth/demo-mode";
import { ForbiddenError } from "@/lib/errors";

describe("demo-mode 游客演示模式", () => {
  it("通过演示邮箱识别演示用户", () => {
    expect(isDemoUser({ email: "demo@rongyan.ai" })).toBe(true);
    expect(isDemoUser({ email: "real@student.edu.cn" })).toBe(false);
    expect(isDemoUser(null)).toBe(false);
    expect(isDemoUser(undefined)).toBe(false);
    expect(isDemoUser({})).toBe(false);
  });

  it("演示用户执行破坏性操作时抛出 ForbiddenError", () => {
    expect(() =>
      validateDemoUserPermission({ email: "demo@rongyan.ai" }, "删除数据")
    ).toThrow(/演示账户禁止删除数据/);
    expect(() =>
      validateDemoUserPermission({ email: "demo@rongyan.ai" }, "删除数据")
    ).toBeInstanceOf(ForbiddenError);
  });

  it("正式用户不受演示限制", () => {
    expect(() =>
      validateDemoUserPermission({ email: "real@student.edu.cn" }, "删除数据")
    ).not.toThrow();
  });

  it("安全方法白名单仅包含只读 HTTP 方法", () => {
    expect(DEMO_SAFE_METHODS).toEqual(["GET", "HEAD", "OPTIONS"]);
  });
});
