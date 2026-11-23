import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildColumnMeta,
  DataParseError,
  detectFileKind,
  MAX_FILE_BYTES,
  parseTabularFile,
} from "@/lib/data/parse";
import { toDataSetDetail, toDataSetListItem } from "@/lib/data/serialize";

// 数据集集合路由：GET 列表 / POST 上传解析（CSV / Excel）
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_NAME_CHARS = 80;

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const datasets = await prisma.dataSet.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { charts: true } } },
  });

  return Response.json({ datasets: datasets.map(toDataSetListItem) });
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
    return Response.json({ error: "缺少 file 字段（CSV / Excel 文件）" }, { status: 400 });
  }
  if (!detectFileKind(file.name)) {
    return Response.json({ error: "仅支持 CSV、.xlsx、.xls 文件" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "文件不能超过 5MB" }, { status: 400 });
  }

  const rawName = form.get("name");
  const name =
    typeof rawName === "string" && rawName.trim()
      ? rawName.trim().slice(0, MAX_NAME_CHARS)
      : file.name.replace(/\.[^.]+$/, "").slice(0, MAX_NAME_CHARS) || "未命名数据集";

  // 内存中解析（文件不落盘）
  const buffer = Buffer.from(await file.arrayBuffer());
  let table;
  try {
    table = await parseTabularFile({ buffer, filename: file.name });
  } catch (error) {
    if (error instanceof DataParseError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    console.error("[data/upload] 表格解析失败:", error);
    return Response.json({ error: "文件解析失败，请确认格式正确且未损坏" }, { status: 422 });
  }

  const columns = buildColumnMeta(table.headers, table.rows);

  const created = await prisma.dataSet.create({
    data: {
      userId,
      name,
      sourceName: file.name,
      rowCount: table.rows.length,
      columnCount: columns.length,
      columns: JSON.stringify(columns),
      rows: JSON.stringify(table.rows),
    },
  });

  return Response.json(
    {
      dataset: toDataSetDetail(created),
      truncated: table.truncated,
      ...(table.truncated
        ? { warning: `数据超过 1000 行，已只保留前 ${table.rows.length} 行用于分析与出图` }
        : {}),
    },
    { status: 201 }
  );
}
