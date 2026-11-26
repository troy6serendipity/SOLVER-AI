import { createHash, randomBytes } from "crypto";
import { existsSync, mkdirSync, writeFile, readFile, unlink, createReadStream } from "fs";
import { join, extname } from "path";
import { promisify } from "util";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/lib/errors";

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);

// 存储配置
const STORAGE_ROOT = process.env.STORAGE_ROOT || join(process.cwd(), ".storage");
const STORAGE_URL_PREFIX = process.env.STORAGE_URL_PREFIX || "/api/storage";
const SIGNATURE_SECRET = process.env.STORAGE_SIGNATURE_SECRET || randomBytes(32).toString("hex");
const SIGNED_URL_EXPIRY = 3600; // 1小时有效期

// 支持的文件类型与大小限制
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"],
};

const MAX_FILE_SIZES: Record<string, number> = {
  pdf: 10 * 1024 * 1024, // 10MB
  image: 5 * 1024 * 1024, // 5MB
  document: 20 * 1024 * 1024, // 20MB
};

// 初始化存储目录
function initStorage() {
  const dirs = ["uploads", "temp"];
  for (const dir of dirs) {
    const fullPath = join(STORAGE_ROOT, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }
}

initStorage();

/**
 * 生成文件哈希，用于去重
 */
function generateFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * 生成随机文件名
 */
function generateRandomFileName(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const random = randomBytes(16).toString("hex");
  return `${random}${ext}`;
}

/**
 * 验证文件类型与大小
 */
export function validateFile(file: File, category: keyof typeof ALLOWED_MIME_TYPES) {
  const allowedMimes = ALLOWED_MIME_TYPES[category];
  if (!allowedMimes.includes(file.type)) {
    throw new BadRequestError(`不支持的文件类型，仅允许: ${allowedMimes.join(", ")}`);
  }

  const maxSize = MAX_FILE_SIZES[category];
  if (file.size > maxSize) {
    throw new BadRequestError(`文件过大，最大允许 ${Math.round(maxSize / 1024 / 1024)}MB`);
  }
}

/**
 * 存储文件到本地磁盘
 * @param file 上传的文件
 * @param category 文件分类（pdf/image/document）
 * @param userId 所属用户ID
 * @returns 文件元数据
 */
export async function storeFile(file: File, category: keyof typeof ALLOWED_MIME_TYPES, userId: string) {
  validateFile(file, category);

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = generateFileHash(buffer);
  const fileName = generateRandomFileName(file.name);
  const relativePath = join("uploads", userId, category, fileName);
  const fullPath = join(STORAGE_ROOT, relativePath);

  // 创建用户目录
  const userDir = join(STORAGE_ROOT, "uploads", userId, category);
  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
  }

  // 写入文件
  await writeFileAsync(fullPath, buffer);

  return {
    fileId: fileHash,
    fileName: file.name,
    storedName: fileName,
    filePath: relativePath,
    fileSize: file.size,
    mimeType: file.type,
    category,
    hash: fileHash,
  };
}

/**
 * 读取文件内容
 * @param filePath 文件相对路径
 * @param userId 用户ID（校验权限）
 * @returns 文件Buffer
 */
export async function getFile(filePath: string, userId: string) {
  // 校验路径是否属于该用户
  if (!filePath.startsWith(`uploads/${userId}/`)) {
    throw new ForbiddenError("无权访问该文件");
  }

  const fullPath = join(STORAGE_ROOT, filePath);
  if (!existsSync(fullPath)) {
    throw new NotFoundError("文件不存在");
  }

  return readFileAsync(fullPath);
}

/**
 * 删除文件
 * @param filePath 文件相对路径
 * @param userId 用户ID（校验权限）
 */
export async function deleteFile(filePath: string, userId: string) {
  if (!filePath.startsWith(`uploads/${userId}/`)) {
    throw new ForbiddenError("无权删除该文件");
  }

  const fullPath = join(STORAGE_ROOT, filePath);
  if (existsSync(fullPath)) {
    await unlinkAsync(fullPath);
  }
}

/**
 * 生成签名URL
 * @param filePath 文件相对路径
 * @param userId 用户ID
 * @param expiresIn 有效期（秒）
 * @returns 签名URL
 */
export function generateSignedUrl(filePath: string, userId: string, expiresIn = SIGNED_URL_EXPIRY): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const payload = `${filePath}:${userId}:${expiresAt}`;
  const signature = createHash("sha256")
    .update(`${payload}:${SIGNATURE_SECRET}`)
    .digest("hex");

  const encodedPath = encodeURIComponent(filePath);
  return `${STORAGE_URL_PREFIX}/${encodedPath}?expires=${expiresAt}&sig=${signature}&uid=${userId}`;
}

/**
 * 验证签名URL
 * @param filePath 文件相对路径
 * @param userId 用户ID
 * @param expires 过期时间戳
 * @param signature 签名
 * @returns 是否有效
 */
export function verifySignedUrl(filePath: string, userId: string, expires: number, signature: string): boolean {
  // 检查是否过期
  if (Date.now() / 1000 > expires) {
    return false;
  }

  // 验证签名
  const payload = `${filePath}:${userId}:${expires}`;
  const expectedSignature = createHash("sha256")
    .update(`${payload}:${SIGNATURE_SECRET}`)
    .digest("hex");

  return signature === expectedSignature;
}

/**
 * 创建文件可读流（用于下载）
 * @param filePath 文件相对路径
 * @param userId 用户ID
 * @returns ReadStream
 */
export function createFileStream(filePath: string, userId: string) {
  if (!filePath.startsWith(`uploads/${userId}/`)) {
    throw new ForbiddenError("无权访问该文件");
  }

  const fullPath = join(STORAGE_ROOT, filePath);
  if (!existsSync(fullPath)) {
    throw new NotFoundError("文件不存在");
  }

  return createReadStream(fullPath);
}
