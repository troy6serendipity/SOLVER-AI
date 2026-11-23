"use client";

import { ColumnMeta } from "@/lib/data/types";
import { BarChart3, Calendar, Hash, Type } from "lucide-react";

interface ColumnInfoPanelProps {
  columns: ColumnMeta[];
}

const typeIcons: Record<string, React.ReactNode> = {
  number: <Hash className="w-4 h-4 text-blue-500" />,
  category: <BarChart3 className="w-4 h-4 text-purple-500" />,
  date: <Calendar className="w-4 h-4 text-green-500" />,
  text: <Type className="w-4 h-4 text-orange-500" />,
};

const typeLabels: Record<string, string> = {
  number: "数值型",
  category: "分类型",
  date: "时间型",
  text: "文本型",
};

export function ColumnInfoPanel({ columns }: ColumnInfoPanelProps) {
  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="font-semibold">字段统计信息（共 {columns.length} 列）</h3>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto">
        {columns.map((col, index) => (
          <div key={index} className="border rounded-lg p-3 bg-background hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              {typeIcons[col.type]}
              <span className="font-medium text-sm truncate" title={col.name}>
                {col.name}
              </span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded bg-muted">
                {typeLabels[col.type]}
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                缺失值：<span className="font-mono">{col.missing}</span> / 唯一值：<span className="font-mono">{col.unique}</span>
              </div>
              {col.type === "number" && (
                <div>
                  范围：<span className="font-mono">{col.min?.toFixed(2) ?? "-"}</span> ~ <span className="font-mono">{col.max?.toFixed(2) ?? "-"}</span> / 均值：<span className="font-mono">{col.mean?.toFixed(2) ?? "-"}</span>
                </div>
              )}
              {col.type === "date" && (
                <div>
                  时间：<span>{col.first?.slice(0, 10) ?? "-"}</span> 至 <span>{col.last?.slice(0, 10) ?? "-"}</span>
                </div>
              )}
              {col.samples.length > 0 && (
                <div className="truncate" title={col.samples.join("、")}>
                  高频：{col.samples.slice(0, 2).join("、")}
                  {col.samples.length > 2 ? ` 等${col.samples.length}个` : ""}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
