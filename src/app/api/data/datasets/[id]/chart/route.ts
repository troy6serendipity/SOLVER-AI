import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findOwnedDataset } from "@/lib/data/queries";
import { parseColumns, parseRows, toChartRecord } from "@/lib/data/serialize";
import { generateChart } from "@/lib/ai/data-service";
import type { ChartRequestPayload } from "@/lib/data/types";
import { z } from "zod";

// 基于数据集生成图表
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

const PayloadSchema = z.object({
  mode: z.enum(["prompt", "recommend"]).default("prompt"),
  prompt: z.string().max(1000).optional(),
});

export async function POST(request: Request, props: { params: Params }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }
  const { id } = await props.params;

  const dataset = await findOwnedDataset(userId, id);
  if (!dataset) {
    return Response.json({ error: "数据集不存在或无权限访问" }, { status: 404 });
  }

  const raw = await request.json() as unknown;
  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "参数格式错误" }, { status: 400 });
  }
  const { mode, prompt } = parsed.data;
  if (mode === "prompt" && (!prompt || prompt.trim() === "")) {
    return Response.json({ error: "prompt 不能为空" }, { status: 400 });
  }

  const columns = parseColumns(dataset.columns);
  const rows = parseRows(dataset.rows);
  if (columns.length === 0 || rows.length === 0) {
    return Response.json({ error: "数据集为空，无法生成图表" }, { status: 400 });
  }

  let generated;
  try {
    generated = await generateChart(userId, {
      name: dataset.name,
      headers: columns.map((col) => col.name),
      columns,
      rows,
      mode,
      prompt,
    });
  } catch (error) {
    console.error("[data/chart] 生成失败:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "生成图表失败，请重试" },
      { status: 500 }
    );
  }

  const chart = await prisma.dataChart.create({
    data: {
      userId,
      dataSetId: id,
      title: generated.title,
      chartType: generated.chartType,
      prompt: mode === "prompt" ? prompt : null,
      mode,
      option: JSON.stringify(generated.option),
      insight: generated.insight,
    },
  });

  return Response.json({ chart: toChartRecord(chart) }, { status: 201 });
}

// 查询该数据集下的所有图表
export async function GET(_: Request, props: { params: Params }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }
  const { id } = await props.params;

  const dataset = await findOwnedDataset(userId, id);
  if (!dataset) {
    return Response.json({ error: "数据集不存在或无权限访问" }, { status: 404 });
  }

  const charts = await prisma.dataChart.findMany({
    where: { dataSetId: id, userId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ charts: charts.map(toChartRecord) });
}
