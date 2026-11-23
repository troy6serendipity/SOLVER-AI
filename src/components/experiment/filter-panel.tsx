"use client";

import { useState } from "react";
import { FileText, Download, Copy, Check } from "lucide-react";
import { generateReport } from "@/lib/experiment/client-api";

interface FilterPanelProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onFilter: () => void;
  onReset: () => void;
  selectedCount: number;
  onCompare: () => void;
  showCompare?: boolean;
}

export function FilterPanel({
  keyword,
  onKeywordChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onFilter,
  onReset,
  selectedCount,
  onCompare,
  showCompare = false,
}: FilterPanelProps) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerateReport() {
    if (!reportStartDate || !reportEndDate) {
      alert("请选择开始日期和结束日期");
      return;
    }
    setLoadingReport(true);
    try {
      const report = await generateReport({
        startDate: reportStartDate,
        endDate: reportEndDate,
      });
      setReportMarkdown(report.markdown);
    } catch (err) {
      alert(err instanceof Error ? err.message : "生成失败，请稍后重试");
    } finally {
      setLoadingReport(false);
    }
  }

  async function copyReport() {
    await navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadReport() {
    const blob = new Blob([reportMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `组会周报_${reportStartDate}_${reportEndDate}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">关键词搜索</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="搜索实验名称/内容"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={onFilter}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-primary/90"
          >
            筛选
          </button>
          <button
            onClick={onReset}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            重置
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          {showCompare && (
            <button
              onClick={onCompare}
              disabled={selectedCount !== 2}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md ${
                selectedCount === 2
                  ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              <FileText className="h-4 w-4" />
              对比选中的 {selectedCount} 条记录
            </button>
          )}
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-green-50 text-green-700 hover:bg-green-100"
        >
          <Download className="h-4 w-4" />
          生成组会周报
        </button>
      </div>

      {/* 周报生成模态框 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">生成组会周报</h3>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportMarkdown("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {!reportMarkdown ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    选择时间范围，AI 将自动汇总该时间段内的所有实验记录，生成结构化周报。
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">开始日期</label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full rounded-md border px-3 py-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">结束日期</label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full rounded-md border px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      周报生成完成，可直接复制或下载 Markdown 文件。
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={copyReport}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "已复制" : "复制 Markdown"}
                      </button>
                      <button
                        onClick={downloadReport}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
                      >
                        <Download className="h-4 w-4" />
                        下载文件
                      </button>
                    </div>
                  </div>
                  <pre className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap overflow-auto max-h-[50vh]">
                    {reportMarkdown}
                  </pre>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              {!reportMarkdown ? (
                <>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-md border hover:bg-muted"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleGenerateReport}
                    disabled={loadingReport || !reportStartDate || !reportEndDate}
                    className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loadingReport ? "生成中…" : "生成周报"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportMarkdown("");
                  }}
                  className="px-4 py-2 rounded-md border hover:bg-muted"
                >
                  关闭
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
