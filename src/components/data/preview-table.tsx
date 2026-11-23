"use client";

import type { CellValue } from "@/lib/data/types";

interface DataPreviewTableProps {
  headers: string[];
  rows: CellValue[][];
  maxRows?: number;
}

export function DataPreviewTable({ headers, rows, maxRows = 20 }: DataPreviewTableProps) {
  const showRows = rows.slice(0, maxRows);
  const hasMore = rows.length > maxRows;

  function formatCell(value: CellValue) {
    if (value === null || value === undefined) return <span className="text-muted-foreground text-xs">空</span>;
    if (typeof value === "string" && value.length > 60) return value.slice(0, 60) + "...";
    if (typeof value === "number") return value.toLocaleString("zh-CN", { maximumFractionDigits: 4 });
    return String(value);
  }

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold">数据预览（共 {rows.length} 行）</h3>
        <span className="text-xs text-muted-foreground">
          最多显示前 {maxRows} 行
        </span>
      </div>
      <div className="overflow-x-auto max-h-[400px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-muted/30 backdrop-blur">
            <tr className="border-b">
              {headers.map((header, index) => (
                <th key={index} className="px-4 py-2 text-left text-xs font-medium whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b hover:bg-muted/30 transition-colors">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2 text-xs">
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
            {hasMore && (
              <tr>
                <td colSpan={headers.length} className="text-center text-xs text-muted-foreground py-3">
                  已省略 {rows.length - maxRows} 行
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

