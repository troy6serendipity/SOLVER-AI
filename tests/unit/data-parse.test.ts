import { detectFileKind, DataParseError, MAX_ROWS, MAX_FILE_BYTES } from "@/lib/data/parse";

describe("data/parse 表格解析工具", () => {
  describe("detectFileKind", () => {
    it("识别 CSV / TXT 为 csv 类型", () => {
      expect(detectFileKind("grades.csv")).toBe("csv");
      expect(detectFileKind("raw.txt")).toBe("csv");
      expect(detectFileKind("UPPER.CSV")).toBe("csv");
    });

    it("识别 xlsx / xls 为 excel 类型", () => {
      expect(detectFileKind("survey.xlsx")).toBe("excel");
      expect(detectFileKind("legacy.xls")).toBe("excel");
    });

    it("不支持的扩展名返回 null", () => {
      expect(detectFileKind("malware.exe")).toBeNull();
      expect(detectFileKind("noext")).toBeNull();
    });
  });

  it("解析上限常量符合主规范约束", () => {
    // 主规范：单数据集最多解析 1000 行、文件不超过 5MB
    expect(MAX_ROWS).toBe(1000);
    expect(MAX_FILE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("DataParseError 可被 instanceof 识别并携带消息", () => {
    const error = new DataParseError("解析失败");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DataParseError");
    expect(error.message).toBe("解析失败");
  });
});
