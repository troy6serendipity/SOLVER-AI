import { prisma } from "@/lib/prisma";
import type { DataSet } from "@prisma/client";

/** 读取归属指定用户的数据集，不存在或不属于该用户时返回 null */
export async function findOwnedDataset(
  userId: string,
  id: string
): Promise<DataSet | null> {
  const dataset = await prisma.dataSet.findUnique({ where: { id } });
  if (!dataset || dataset.userId !== userId) return null;
  return dataset;
}

/** 读取归属指定用户的图表，不存在或不属于该用户时返回 null */
export async function findOwnedChart(userId: string, id: string) {
  const chart = await prisma.dataChart.findUnique({ where: { id } });
  if (!chart || chart.userId !== userId) return null;
  return chart;
}
