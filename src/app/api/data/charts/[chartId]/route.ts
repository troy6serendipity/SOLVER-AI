import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findOwnedChart } from "@/lib/data/queries";

// 单条图表删除
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = Promise<{ chartId: string }>;

export async function DELETE(_: Request, props: { params: Params }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "未登录或登录已过期" }, { status: 401 });
  }
  const { chartId } = await props.params;

  const chart = await findOwnedChart(userId, chartId);
  if (!chart) {
    return Response.json({ error: "图表不存在或无权限访问" }, { status: 404 });
  }

  await prisma.dataChart.delete({ where: { id: chartId } });
  return Response.json({ success: true, deletedId: chartId });
}
