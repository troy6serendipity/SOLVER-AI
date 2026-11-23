import type { DataChart, DataSet } from "@prisma/client";
import type {
  CellValue,
  ChartRecord,
  ColumnMeta,
  DataSetDetail,
  DataSetListItem,
} from "./types";

// 把 Prisma 行中的 JSON 字符串字段解析为前端可用的对象结构

export function parseColumns(raw: string | null): ColumnMeta[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ColumnMeta =>
        typeof item === "object" && item !== null && typeof (item as ColumnMeta).name === "string"
    );
  } catch {
    return [];
  }
}

export function parseRows(raw: string | null): CellValue[][] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[][]).map((row) =>
      Array.isArray(row)
        ? (row.map((cell) =>
            cell === null || cell === undefined
              ? null
              : typeof cell === "number" || typeof cell === "string"
                ? cell
                : String(cell)
          ) as CellValue[])
        : []
    );
  } catch {
    return [];
  }
}

export function parseOption(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // 忽略历史脏数据
  }
  return {};
}

export function toDataSetListItem(
  row: DataSet & { _count?: { charts: number } }
): DataSetListItem {
  return {
    id: row.id,
    name: row.name,
    sourceName: row.sourceName,
    rowCount: row.rowCount,
    columnCount: row.columnCount,
    createdAt: row.createdAt.toISOString(),
    ...(row._count ? { chartCount: row._count.charts } : {}),
  };
}

export function toDataSetDetail(row: DataSet): DataSetDetail {
  const columns = parseColumns(row.columns);
  return {
    ...toDataSetListItem(row),
    columns,
    headers: columns.map((column) => column.name),
    rows: parseRows(row.rows),
  };
}

export function toChartRecord(row: DataChart): ChartRecord {
  return {
    id: row.id,
    dataSetId: row.dataSetId,
    title: row.title,
    chartType: row.chartType,
    prompt: row.prompt,
    mode: row.mode,
    option: parseOption(row.option),
    insight: row.insight,
    createdAt: row.createdAt.toISOString(),
  };
}
