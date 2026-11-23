// 科研数据可视化模块的共享类型

/** 字段语义类型：数值 / 分类 / 时间 / 文本 */
export type ColumnType = "number" | "category" | "date" | "text";

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  /** 缺失值个数（空单元格） */
  missing: number;
  /** 去重后的取值个数 */
  unique: number;
  /** 数值列：最小值 / 最大值 / 平均值 */
  min?: number;
  max?: number;
  mean?: number;
  /** 时间列：最早 / 最晚时间（ISO 字符串） */
  first?: string;
  last?: string;
  /** 分类列：出现频率最高的若干取值 */
  samples: string[];
}

/** 单元格值：解析后保持原始标量类型，缺失为 null */
export type CellValue = string | number | null;

export interface DataSetListItem {
  id: string;
  name: string;
  sourceName: string | null;
  rowCount: number;
  columnCount: number;
  createdAt: string;
  chartCount?: number;
}

export interface DataSetDetail extends DataSetListItem {
  columns: ColumnMeta[];
  /** 表头（与 columns 顺序一致） */
  headers: string[];
  /** 数据行（二维数组，列顺序与 headers 一致，最多 1000 行） */
  rows: CellValue[][];
}

export interface DataListResponse {
  datasets: DataSetListItem[];
}

export interface UploadDataSetResponse {
  dataset: DataSetDetail;
  truncated: boolean;
  warning?: string;
}

/** AI 生成图表的输入：自然语言需求 或 推荐模式 */
export interface ChartRequestPayload {
  mode?: "prompt" | "recommend";
  prompt?: string;
}

export interface ChartRecord {
  id: string;
  dataSetId: string;
  title: string;
  chartType: string;
  prompt: string | null;
  mode: string;
  /** 标准 ECharts option */
  option: Record<string, unknown>;
  insight: string | null;
  createdAt: string;
}

export interface ChartResponse {
  chart: ChartRecord;
}

export interface ChartListResponse {
  charts: ChartRecord[];
}
