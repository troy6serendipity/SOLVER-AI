import { auth } from "@/lib/auth";

// OCR 识别接口（预留）。
// 当前阶段只打通「上传图片 → 前端预览 → 手动补充/修改识别文字」的链路，
// 真实 OCR 在此处接入即可，前端契约保持不变：
//   POST /api/ocr  { image: "data:image/png;base64,..." }
//   成功响应       { text: string, provider?: string }
//
// 可选接入方案：
//   1. 百度智能云 / 腾讯云 OCR REST API（服务端转发，避免密钥暴露）
//   2. 通义千问 qwen-vl 等视觉大模型：把 image data 放入多模态消息，要求仅返回识别文本
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_CHARS = 6 * 1024 * 1024; // base64 后约 6MB 上限

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  let body: { image?: unknown };
  try {
    body = (await request.json()) as { image?: unknown };
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const image = typeof body.image === "string" ? body.image : "";
  if (!image.startsWith("data:image/") || image.length > MAX_IMAGE_CHARS) {
    return Response.json(
      { error: "请上传合法的 base64 图片（data:image 开头，≤6MB）" },
      { status: 400 }
    );
  }

  // TODO(ocr): 在此接入真实 OCR 服务，识别成功后返回 { text, provider }。
  return Response.json(
    {
      error: "OCR_SERVICE_NOT_CONFIGURED",
      message:
        "OCR 识别服务尚未配置，请在下方手动输入或修改识别文字；后端接入点为 /api/ocr。",
    },
    { status: 501 }
  );
}
