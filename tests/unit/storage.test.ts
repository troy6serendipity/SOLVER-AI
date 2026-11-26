import {
  validateFile,
  generateSignedUrl,
  verifySignedUrl,
  storeFile,
  getFile,
  deleteFile,
} from "@/lib/storage/local-adapter";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";

describe("local-adapter 本地私有文件存储", () => {
  const userId = "user-test-001";

  describe("validateFile", () => {
    it("接受合法的小体积 PDF", () => {
      const file = new File([new Uint8Array(100)], "paper.pdf", {
        type: "application/pdf",
      });
      expect(() => validateFile(file, "pdf")).not.toThrow();
    });

    it("拒绝错误 MIME 类型", () => {
      const file = new File(["x"], "paper.pdf", { type: "text/plain" });
      expect(() => validateFile(file, "pdf")).toThrow(BadRequestError);
    });

    it("拒绝超出大小限制的文件", () => {
      const oversized = new File([new Uint8Array(11 * 1024 * 1024)], "big.pdf", {
        type: "application/pdf",
      });
      expect(() => validateFile(oversized, "pdf")).toThrow(/文件过大/);
    });
  });

  describe("签名 URL 生成与校验", () => {
    const filePath = "uploads/user-test-001/pdf/abc123.pdf";

    it("生成的签名 URL 可通过校验", () => {
      const url = generateSignedUrl(filePath, userId);
      expect(url).toContain("/api/storage/");
      expect(url).toContain("expires=");
      expect(url).toContain("sig=");

      const parsed = new URL(url, "http://localhost");
      const expires = Number(parsed.searchParams.get("expires"));
      const sig = parsed.searchParams.get("sig") as string;
      const decodedPath = decodeURIComponent(
        url.split("/api/storage/")[1].split("?")[0]
      );

      expect(verifySignedUrl(decodedPath, userId, expires, sig)).toBe(true);
    });

    it("篡改用户 ID 后签名失效", () => {
      const url = generateSignedUrl(filePath, userId);
      const parsed = new URL(url, "http://localhost");
      const expires = Number(parsed.searchParams.get("expires"));
      const sig = parsed.searchParams.get("sig") as string;
      expect(verifySignedUrl(filePath, "attacker-user", expires, sig)).toBe(false);
    });

    it("过期时间戳校验失败", () => {
      const url = generateSignedUrl(filePath, userId);
      const parsed = new URL(url, "http://localhost");
      const sig = parsed.searchParams.get("sig") as string;
      const expired = Math.floor(Date.now() / 1000) - 10;
      expect(verifySignedUrl(filePath, userId, expired, sig)).toBe(false);
    });
  });

  describe("文件写入、读取与删除（真实磁盘 IO）", () => {
    it("storeFile 落盘后 getFile 可读回，deleteFile 后再读报 NotFound", async () => {
      const content = new TextEncoder().encode("hello solver ai");
      const file = new File([content], "note.pdf", {
        type: "application/pdf",
      });

      const stored = await storeFile(file, "pdf", userId);
      expect(stored.fileName).toBe("note.pdf");
      expect(stored.hash).toHaveLength(64); // sha256 hex
      expect(stored.filePath.startsWith(`uploads/${userId}/pdf/`)).toBe(true);

      const buffer = await getFile(stored.filePath, userId);
      expect(buffer.toString("utf-8")).toBe("hello solver ai");

      await deleteFile(stored.filePath, userId);
      await expect(getFile(stored.filePath, userId)).rejects.toBeInstanceOf(
        NotFoundError
      );
    });

    it("跨用户访问被拒绝（owner 隔离）", async () => {
      const file = new File([new Uint8Array(10)], "a.pdf", {
        type: "application/pdf",
      });
      const stored = await storeFile(file, "pdf", "owner-user");
      await expect(getFile(stored.filePath, "other-user")).rejects.toBeInstanceOf(
        ForbiddenError
      );
      await deleteFile(stored.filePath, "owner-user");
    });
  });
});
