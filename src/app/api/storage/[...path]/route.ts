import { auth } from "@/lib/auth";
import { getFile, verifySignedUrl } from "@/lib/storage/local-adapter";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { extname } from "path";

// 文件存储访问路由：通过签名URL访问私有文件
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = decodeURIComponent(path.join("/"));
  const { searchParams } = new URL(_request.url);
  
  const expires = searchParams.get("expires");
  const sig = searchParams.get("sig");
  const uid = searchParams.get("uid");

  if (!expires || !sig || !uid) {
    // 无签名参数，尝试用当前登录用户身份访问（仅允许访问自己的文件）
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      throw new ForbiddenError("需要登录或使用签名URL访问");
    }

    const fileBuffer = await getFile(filePath, userId);
    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${filePath.split("/").pop()}"`,
      },
    });
  }

  // 验证签名
  const expiresNum = parseInt(expires, 10);
  if (isNaN(expiresNum)) {
    throw new ForbiddenError("无效的过期时间");
  }

  if (!verifySignedUrl(filePath, uid, expiresNum, sig)) {
    throw new ForbiddenError("无效的签名或URL已过期");
  }

  // 签名验证通过，返回文件
  const fileBuffer = await getFile(filePath, uid);
  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${filePath.split("/").pop()}"`,
    },
  });
}
