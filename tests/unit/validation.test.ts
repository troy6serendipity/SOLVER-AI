import {
  validateRequired,
  validateString,
  validateNumber,
  validateBoolean,
  validateArray,
  validateEnum,
  validateEmail,
  validateUrl,
  isObject,
  parseJsonSafe,
} from "@/lib/validation";
import { BadRequestError } from "@/lib/errors";

describe("validation 通用输入校验工具", () => {
  describe("validateRequired", () => {
    it("对非空值原样返回", () => {
      expect(validateRequired("hello", "字段")).toBe("hello");
      expect(validateRequired(0, "字段")).toBe(0);
      expect(validateRequired(false, "字段")).toBe(false);
    });

    it("对 null / undefined 抛出 BadRequestError", () => {
      expect(() => validateRequired(null, "字段")).toThrow(BadRequestError);
      expect(() => validateRequired(undefined, "字段")).toThrow("字段 不能为空");
    });
  });

  describe("validateString", () => {
    it("接受合法字符串并支持长度边界", () => {
      expect(validateString("abc", "名称", 1, 5)).toBe("abc");
      expect(validateString("", "名称", 0, 5)).toBe("");
    });

    it("拒绝非字符串、过短、过长输入", () => {
      expect(() => validateString(123, "名称")).toThrow(BadRequestError);
      expect(() => validateString("ab", "名称", 3)).toThrow("最少需要 3");
      expect(() => validateString("abcdef", "名称", 0, 3)).toThrow("最多允许 3");
    });
  });

  describe("validateNumber", () => {
    it("接受数字并校验范围", () => {
      expect(validateNumber(42, "年龄", 0, 100)).toBe(42);
    });

    it("拒绝 NaN、非数字与越界值", () => {
      expect(() => validateNumber(NaN, "年龄")).toThrow(BadRequestError);
      expect(() => validateNumber("10", "年龄")).toThrow(BadRequestError);
      expect(() => validateNumber(-1, "年龄", 0)).toThrow("不能小于 0");
      expect(() => validateNumber(101, "年龄", 0, 100)).toThrow("不能大于 100");
    });
  });

  describe("validateBoolean", () => {
    it("接受布尔值", () => {
      expect(validateBoolean(true, "开关")).toBe(true);
      expect(validateBoolean(false, "开关")).toBe(false);
    });

    it("拒绝非布尔值", () => {
      expect(() => validateBoolean("true", "开关")).toThrow(BadRequestError);
    });
  });

  describe("validateArray", () => {
    it("接受数组并支持逐项校验", () => {
      const result = validateArray(["a", "bb"], "标签", (item) =>
        validateString(item, "标签项", 1)
      );
      expect(result).toEqual(["a", "bb"]);
    });

    it("拒绝非数组", () => {
      expect(() => validateArray("not-array", "标签")).toThrow(BadRequestError);
    });
  });

  describe("validateEnum", () => {
    const allowed = ["todo", "in_progress", "done"] as const;

    it("接受枚举内的值", () => {
      expect(validateEnum("done", "状态", [...allowed])).toBe("done");
    });

    it("拒绝枚举外的值并提示允许值", () => {
      expect(() => validateEnum("unknown", "状态", [...allowed])).toThrow(
        /todo, in_progress, done/
      );
    });
  });

  describe("validateEmail", () => {
    it("接受合法邮箱", () => {
      expect(validateEmail("student@university.edu.cn")).toBe("student@university.edu.cn");
    });

    it("拒绝非法邮箱", () => {
      expect(() => validateEmail("no-at-sign", "邮箱")).toThrow("格式不正确");
      expect(() => validateEmail(123, "邮箱")).toThrow(BadRequestError);
    });
  });

  describe("validateUrl", () => {
    it("接受合法 URL", () => {
      expect(validateUrl("https://example.com/path?q=1")).toBe(
        "https://example.com/path?q=1"
      );
    });

    it("拒绝非法 URL", () => {
      expect(() => validateUrl("not a url", "URL")).toThrow("格式不正确");
    });
  });

  describe("isObject", () => {
    it("正确识别普通对象", () => {
      expect(isObject({})).toBe(true);
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject("string")).toBe(false);
    });
  });

  describe("parseJsonSafe", () => {
    it("解析合法 JSON", () => {
      expect(parseJsonSafe('{"a":1}', "数据")).toEqual({ a: 1 });
    });

    it("对非法 JSON 抛出 BadRequestError", () => {
      expect(() => parseJsonSafe("{bad json", "数据")).toThrow("不是合法的 JSON");
    });
  });
});
