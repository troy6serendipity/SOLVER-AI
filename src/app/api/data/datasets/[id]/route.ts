import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findOwnedDataset } from "@/lib/data/queries";
import { toDataSetDetail } from "@/lib/data/serialize";

// 数据集单条路由：GET 详情 / DELETE 删除
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

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

  return Response.json({ dataset: toDataSetDetail(dataset) });
}

export async function DELETE(_: Request, props: { params: Params }) {
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

  // 级联删除关联的图表
  await prisma.dataChart.deleteMany({ where: { dataSetId: id, userId } });
  await prisma.dataSet.delete({ where: { id } });

  return Response.json({ success: true, deletedId: id });
}
