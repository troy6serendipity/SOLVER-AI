import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractPdf, PdfExtractError } from "@/lib/pdf/extract";
import {
  generatePaperSummary,
  normalizeTags,
} from "@/lib/ai/papers-service";
import { toPaperDetail, toPaperListItem } from "@/lib/literature/serialize";
import { storeFile } from "@/lib/storage/local-adapter";
import type { Prisma } from "@prisma/client";

// 文献库集合路由：GET 列表检索 / POST 上传解析
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TITLE_CHARS = 200;

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const favoriteOnly = searchParams.get("favorite") === "true";
  const tag = searchParams.get("tag")?.trim() ?? "";

  const where: Prisma.PaperWhereInput = { userId };
  if (favoriteOnly) where.favorite = true;
  if (tag) where.tags = { contains: tag };
  if (keyword) {
    // 关键词同时匹配标题、摘要与全文（SQLite contains，默认不区分大小写）
    where.OR = [
      { title: { contains: keyword } },
      { abstract: { contains: keyword } },
      { fullText: { contains: keyword } },
    ];
  }

  const papers = await prisma.paper.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  // 标签字典不受筛选条件影响
  const all = await prisma.paper.findMany({
    where: { userId },
    select: { tags: true },
  });
  const tagSet = new Set<string>();
  for (const item of all) {
    if (!item.tags) continue;
    try {
      const parsed = JSON.parse(item.tags) as unknown;
      if (Array.isArray(parsed)) {
        for (const t of parsed) if (typeof t === "string" && t.trim()) tagSet.add(t.trim());
      }
    } catch {
      // 忽略历史脏数据
    }
  }

  return Response.json({
    records: papers.map(toPaperListItem),
    tags: Array.from(tagSet).sort((a, b) => a.localeCompare(b, "zh-CN")),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "请求必须是 multipart/form-data 表单" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "缺少 file 字段（PDF 文件）" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return Response.json({ error: "仅支持 PDF 文件" }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return Response.json({ error: "PDF 文件不能超过 10MB" }, { status: 400 });
  }

  // 可选元数据
  const rawTitle = form.get("title");
  const title =
    typeof rawTitle === "string" && rawTitle.trim()
      ? rawTitle.trim().slice(0, MAX_TITLE_CHARS)
      : file.name.replace(/\.pdf$/i, "");
  let tags: string[] = [];
  const rawTags = form.get("tags");
  if (typeof rawTags === "string" && rawTags.trim()) {
    try {
      tags = normalizeTags(JSON.parse(rawTags));
    } catch {
      tags = normalizeTags(rawTags.split(","));
    }
  }

  // 1. 存储PDF文件到本地存储
  const buffer = Buffer.from(await file.arrayBuffer());
  let storedFile;
  let fileAsset;
  try {
    storedFile = await storeFile(file, "pdf", userId);
    // 创建FileAsset记录
    fileAsset = await prisma.fileAsset.create({
      data: {
        userId,
        fileName: storedFile.fileName,
        fileType: storedFile.category,
        fileSize: storedFile.fileSize,
        storagePath: storedFile.filePath,
        hash: storedFile.hash,
        mimeType: storedFile.mimeType,
      },
    });
  } catch (error) {
    console.error("[papers/upload] 文件存储失败:", error);
    return Response.json(
      { error: "文件存储失败，请稍后重试" },
      { status: 500 }
    );
  }

  // 2. 解析 PDF
  let extraction;
  try {
    extraction = await extractPdf(buffer);
  } catch (error) {
    // 解析失败，回滚删除已存储的文件和FileAsset
    if (fileAsset) {
      await prisma.fileAsset.delete({ where: { id: fileAsset.id } });
      // 这里可以加上删除物理文件的逻辑，暂时先不删便于排查问题
    }
    if (error instanceof PdfExtractError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    console.error("[papers/upload] PDF 解析失败:", error);
    return Response.json(
      { error: "PDF 解析失败，请确认文件未损坏且包含文本层" },
      { status: 422 }
    );
  }

  // 3. 落库（先无速读卡，保证上传主链路成功）
  const paper = await prisma.paper.create({
    data: {
      userId,
      fileAssetId: fileAsset.id,
      title,
      fullText: extraction.fullText,
      paragraphs: JSON.stringify(extraction.paragraphs),
      pageCount: extraction.pageCount,
      filePath: file.name, // 保留旧字段兼容历史数据
      tags: tags.length > 0 ? JSON.stringify(tags) : null,
    },
  });

  // 3. 自动生成三分钟速读卡；失败不影响上传结果
  let summaryWarning: string | null = null;
  let summaryCards = null;
  try {
    summaryCards = await generatePaperSummary(
      userId,
      paper.title,
      extraction.fullText
    );
    if (summaryCards) {
      await prisma.paper.update({
        where: { id: paper.id },
        data: { summary: JSON.stringify(summaryCards) },
      });
    } else {
      summaryWarning = "速读卡生成失败，可在详情页手动重试";
    }
  } catch (error) {
    console.error("[papers/upload] 速读卡生成失败:", error);
    summaryWarning = "速读卡生成失败，可在详情页手动重试";
  }

  const refreshed = await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } });
  return Response.json(
    {
      paper: toPaperDetail(refreshed),
      paragraphCount: extraction.paragraphs.length,
      ...(summaryWarning ? { warning: summaryWarning } : {}),
    },
    { status: 201 }
  );
}
