"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { UploadPanel } from "./upload-panel";
import { DatasetList } from "./dataset-list";
import { ColumnInfoPanel } from "./column-info-panel";
import { DataPreviewTable } from "./preview-table";
import { ChartPromptPanel } from "./chart-prompt-panel";
import { ChartCard } from "./chart-card";
import { getDataSet, listCharts, exportMarkdown, downloadFile } from "@/lib/data/client-api";
import type { ChartRecord, DataSetDetail } from "@/lib/data/types";
import { EChartsRenderer } from "./echarts-renderer";

// 传感器/点云样本数据（示例）
const SENSOR_SCATTER_OPTION = {
  title: { text: "2D 传感器样本数据分布" },
  tooltip: { trigger: "item" },
  grid: { left: 60, right: 30, top: 50, bottom: 60 },
  xAxis: { type: "value", name: "X坐标" },
  yAxis: { type: "value", name: "Y坐标" },
  series: [
    {
      type: "scatter",
      name: "点云数据",
      symbolSize: 6,
      data: Array.from({ length: 1000 }, () => [
        Math.random() * 100,
        Math.random() * 100 + Math.random() * 50 * Math.sin(Math.random() * Math.PI * 2)
      ])
    }
  ]
};

const SENSOR_HEATMAP_OPTION = {
  title: { text: "3D 点云密度热力图" },
  tooltip: { position: "top" },
  grid: { left: 70, right: 30, top: 40, bottom: 60 },
  xAxis: { type: "category", data: Array.from({ length: 10 }, (_, i) => i) },
  yAxis: { type: "category", data: Array.from({ length: 10 }, (_, i) => i) },
  visualMap: { min: 0, max: 20, calculable: true, orient: "horizontal", left: "center", bottom: 10 },
  series: [
    {
      type: "heatmap",
      data: Array.from({ length: 100 }, (_, i) => [i % 10, Math.floor(i / 10), Math.floor(Math.random() * 20)]),
      label: { show: false }
    }
  ]
};

export function DataWorkbench() {
  const [activeTab, setActiveTab] = useState<string>("datasets");
  const [selectedDataset, setSelectedDataset] = useState<DataSetDetail | null>(null);
  const [charts, setCharts] = useState<ChartRecord[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [warning, setWarning] = useState("");

  async function loadDataset(id: string) {
    try {
      const res = await getDataSet(id);
      setSelectedDataset(res.dataset);
      setLoadingCharts(true);
      const chartsRes = await listCharts(id);
      setCharts(chartsRes.charts);
      setActiveTab("analyze");
    } catch (error) {
      alert(error instanceof Error ? error.message : "加载数据集失败");
    } finally {
      setLoadingCharts(false);
    }
  }

  function handleUploadSuccess(dataset: DataSetDetail, warning?: string) {
    setSelectedDataset(dataset);
    setCharts([]);
    setWarning(warning || "");
    setActiveTab("analyze");
  }

  function handleChartGenerated(chart: ChartRecord) {
    setCharts([chart, ...charts]);
  }

  function handleChartDeleted(id: string) {
    setCharts(charts.filter((c) => c.id !== id));
  }

  function handleBack() {
    setSelectedDataset(null);
    setCharts([]);
    setWarning("");
    setActiveTab("datasets");
  }

  function handleExport() {
    if (!selectedDataset) return;
    const content = exportMarkdown(selectedDataset, charts);
    const filename = `${selectedDataset.name}_分析报告_${new Date().toISOString().slice(0, 10)}.md`;
    downloadFile(content, filename, "text/markdown");
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">科研数据可视化</h1>
          <p className="text-muted-foreground">
            上传 CSV / Excel 文件，AI 自动识别字段类型，支持自然语言生成图表与解读，一键导出分析报告。
          </p>
        </div>
        {selectedDataset && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              导出 Markdown 报告
            </Button>
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回数据集列表
            </Button>
          </div>
        )}
      </div>

      {warning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg">
          {warning}
        </div>
      )}

      {!selectedDataset ? (
        <div className="w-full">
          <div className="flex items-center gap-2 mb-6 border-b">
            <button
              type="button"
              onClick={() => setActiveTab("datasets")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "datasets"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              我的数据集
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "upload"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              上传数据
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sensor")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "sensor"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              传感器样本预览
            </button>
          </div>

          {activeTab === "datasets" && (
            <DatasetList onSelect={loadDataset} />
          )}

          {activeTab === "upload" && (
            <UploadPanel onSuccess={handleUploadSuccess} />
          )}

          {activeTab === "sensor" && (
            <div className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">传感器/点云数据样本预览</h3>
                <p className="text-sm text-muted-foreground">
                  本模块预留支持传感器、点云、3D 数据的预览与可视化，以下为示例数据展示。
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border rounded-xl bg-card overflow-hidden">
                  <EChartsRenderer option={SENSOR_SCATTER_OPTION} className="w-full h-[400px]" />
                </div>
                <div className="border rounded-xl bg-card overflow-hidden">
                  <EChartsRenderer option={SENSOR_HEATMAP_OPTION} className="w-full h-[400px]" />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-muted/30 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-1">{selectedDataset.name}</h2>
            <p className="text-sm text-muted-foreground">
              共 {selectedDataset.rowCount} 行，{selectedDataset.columnCount} 列，来源：{selectedDataset.sourceName || "未知"}
            </p>
          </div>

          <ColumnInfoPanel columns={selectedDataset.columns} />
          <DataPreviewTable headers={selectedDataset.headers} rows={selectedDataset.rows} />

          <ChartPromptPanel dataset={selectedDataset} onChartGenerated={handleChartGenerated} />

          {loadingCharts ? (
            <div className="text-center py-8 text-muted-foreground">加载图表中...</div>
          ) : charts.length > 0 ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">已生成图表（{charts.length} 个）</h3>
              <div className="grid grid-cols-1 gap-6">
                {charts.map((chart) => (
                  <ChartCard key={chart.id} chart={chart} onDeleted={handleChartDeleted} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
