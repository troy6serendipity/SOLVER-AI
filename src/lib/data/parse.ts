import type { CellValue, ColumnMeta, ColumnType } from "./types";

// 表格文件解析：CSV / Excel → 表头 + 前 1000 行数据 + 字段类型推断与统计。
// 解析全部在服务端进行（xlsx / papaparse 均为 Node 端动态导入，不进客户端包）。

export const MAX_ROWS = 1000;
export const MAX_COLUMNS = 50;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type FileKind = "csv" | "excel";

export class DataParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataParseError";
  }
}

/** 依据扩展名判断文件类型 */
export function detectFileKind(filename: string): FileKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) return "csv";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "excel";
  return null;
}

export interface ParsedTable {
  headers: string[];
  rows: CellValue[][];
  /** 文件中的实际数据行数（未截断前的行数） */
  totalRows: number;
  truncated: boolean;
}

/** 数字字符串转数值：避免把 "007"、"1.2.3" 误转，保护前导零 ID */
const STRICT_NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

function normalizeCell(raw: unknown): CellValue {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  }
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "boolean") return raw ? "true" : "false";
  if (typeof raw === "string") {
    const trimmed = raw.replace(/^\uFEFF/, "").trim();
    if (trimmed === "") return null;
    if (STRICT_NUMBER.test(trimmed)) return Number(trimmed);
    return trimmed;
  }
  return String(raw);
}

/** 表头归一化：去空白、补空列名、去重（重名追加 _2/_3） */
function normalizeHeaders(rawHeaders: unknown[], width: number): string[] {
  const headers: string[] = [];
  const used = new Map<string, number>();
  for (let i = 0; i < width; i += 1) {
    const cell = rawHeaders[i];
    let name =
      typeof cell === "string" && cell.trim() !== ""
        ? cell.replace(/^\uFEFF/, "").trim()
        : "";
    if (!name) name = `列${i + 1}`;
    name = name.slice(0, 60);
    const seen = used.get(name);
    if (seen === undefined) {
      used.set(name, 1);
    } else {
      const next = seen + 1;
      used.set(name, next);
      name = `${name}_${next}`;
    }
    headers.push(name);
  }
  return headers;
}

/** 裁剪矩阵到统一宽度，多余列丢弃、缺失列补 null */
function alignRows(matrix: unknown[][], width: number): CellValue[][] {
  return matrix.map((row) => {
    const normalized: CellValue[] = [];
    for (let i = 0; i < width; i += 1) {
      normalized.push(normalizeCell(row[i]));
    }
    return normalized;
  });
}

async function parseCsv(buffer: Buffer): Promise<unknown[][]> {
  const Papa = (await import("papaparse")).default;
  const text = buffer.toString("utf8");
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
  });
  if (result.data.length === 0) {
    throw new DataParseError("CSV 内容为空，未解析到任何行");
  }
  return result.data as unknown[][];
}

async function parseExcel(buffer: Buffer): Promise<unknown[][]> {
  const mod = await import("xlsx");
  const XLSX = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new DataParseError("Excel 文件中没有可用的工作表");
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });
  if (matrix.length === 0) {
    throw new DataParseError("Excel 首个工作表为空，未解析到任何行");
  }
  return matrix as unknown[][];
}

/**
 * 解析 CSV / Excel 文件为表头 + 数据行（上限 1000 行 / 50 列）。
 * 首行视为表头，其余为数据行。
 */
export async function parseTabularFile(params: {
  buffer: Buffer;
  filename: string;
}): Promise<ParsedTable> {
  const { buffer, filename } = params;
  const kind = detectFileKind(filename);
  if (!kind) {
    throw new DataParseError("仅支持 CSV 与 Excel（.xlsx/.xls）文件");
  }
  if (buffer.byteLength === 0) {
    throw new DataParseError("文件内容为空");
  }

  const matrix = kind === "csv" ? await parseCsv(buffer) : await parseExcel(buffer);

  const rawHeader = matrix[0] ?? [];
  const dataMatrix = matrix.slice(1);
  const width = Math.min(
    MAX_COLUMNS,
    Math.max(rawHeader.length, ...dataMatrix.slice(0, 50).map((r) => r.length), 1)
  );

  const headers = normalizeHeaders(rawHeader, width);
  const allRows = alignRows(dataMatrix, width);
  const truncated = allRows.length > MAX_ROWS;
  const rows = allRows.slice(0, MAX_ROWS);

  if (dataMatrix.length === 0) {
    throw new DataParseError("文件中只有表头，没有数据行");
  }

  return { headers, rows, totalRows: allRows.length, truncated };
}

// ===== 字段类型推断与统计 =====

const DATE_PATTERN =
  /^\d{4}[-/]\d{1,2}([-/]\d{1,2})?([ T]\d{1,2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

function isDateLike(value: CellValue): boolean {
  if (typeof value !== "string") return false;
  if (!DATE_PATTERN.test(value.trim())) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isNumericLike(value: CellValue): boolean {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;
  return STRICT_NUMBER.test(value.trim());
}

function toNumber(value: CellValue): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && STRICT_NUMBER.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

/** 推断单列语义类型 */
export function inferColumnType(values: CellValue[]): ColumnType {
  const nonEmpty = values.filter((v) => v !== null && v !== "");
  if (nonEmpty.length === 0) return "text";

  let numeric = 0;
  let dateLike = 0;
  for (const value of nonEmpty) {
    if (isNumericLike(value)) numeric += 1;
    if (isDateLike(value)) dateLike += 1;
  }
  if (numeric / nonEmpty.length >= 0.8) return "number";
  if (dateLike / nonEmpty.length >= 0.8) return "date";

  const unique = new Set(nonEmpty.map((v) => String(v))).size;
  if (unique <= 50 && unique <= Math.max(2, nonEmpty.length * 0.3)) {
    return "category";
  }
  return "text";
}

/** 汇总列统计信息（供预览面板与 AI 上下文使用） */
export function buildColumnMeta(headers: string[], rows: CellValue[][]): ColumnMeta[] {
  return headers.map((name, index) => {
    const values = rows.map((row) => row[index] ?? null);
    const nonEmpty = values.filter((v) => v !== null && v !== "");
    const type = inferColumnType(values);

    const meta: ColumnMeta = {
      name,
      type,
      missing: values.length - nonEmpty.length,
      unique: new Set(nonEmpty.map((v) => String(v))).size,
      samples: [],
    };

    if (type === "number") {
      const numbers = nonEmpty
        .map((v) => toNumber(v))
        .filter((n): n is number => n !== null);
      if (numbers.length > 0) {
        meta.min = Math.min(...numbers);
        meta.max = Math.max(...numbers);
        meta.mean =
          Math.round((numbers.reduce((sum, n) => sum + n, 0) / numbers.length) * 1000) /
          1000;
      }
    } else if (type === "date") {
      const times = nonEmpty
        .map((v) => new Date(String(v)).getTime())
        .filter((t) => !Number.isNaN(t))
        .sort((a, b) => a - b);
      if (times.length > 0) {
        meta.first = new Date(times[0]).toISOString();
        meta.last = new Date(times[times.length - 1]).toISOString();
      }
    } else {
      const counter = new Map<string, number>();
      for (const value of nonEmpty) {
        const key = String(value);
        counter.set(key, (counter.get(key) ?? 0) + 1);
      }
      meta.samples = Array.from(counter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key]) => key.slice(0, 40));
    }

    return meta;
  });
}
