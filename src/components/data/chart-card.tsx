"use client";

import { useState } from "react";
import { Copy, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EChartsRenderer } from "./echarts-renderer";
import type { ChartRecord } from "@/lib/data/types";
import { deleteChart } from "@/lib/data/client-api";

interface ChartCardProps {
  chart: ChartRecord;
  onDeleted: (id: string) => void;
}

export function ChartCard({ chart, onDeleted }: ChartCardProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("确定要删除这张图表吗？")) return;
    setDeleting(true);
    try {
      await deleteChart(chart.id);
      onDeleted(chart.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function handleCopyInsight() {
    navigator.clipboard.writeText(chart.insight || "").then(() => {
      alert("解读已复制到剪贴板");
    });
  }

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <h4 className="font-medium">{chart.title}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
            {chart.chartType === "scatter"
              ? "散点图"
              : chart.chartType === "line"
                ? "折线图"
                : chart.chartType === "bar"
                  ? "柱状图"
                  : chart.chartType === "heatmap"
                    ? "热力图"
                    : chart.chartType}
          </span>
          <Button variant="ghost" size="sm" onClick={handleCopyInsight} title="复制解读">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} title="删除">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
      <EChartsRenderer option={chart.option} className="w-full h-[360px]" />
      {chart.insight && (
        <div className="p-4 border-t text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Download className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <p className="leading-relaxed">{chart.insight}</p>
          </div>
        </div>
      )}
    </div>
  );
}
