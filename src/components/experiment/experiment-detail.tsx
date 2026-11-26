"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeft, Lightbulb, Copy, Check } from "lucide-react";
import type { ExperimentLogDetail, AiExperimentSummaryResponse } from "../types";
import { summarizeExperiment } from "@/lib/experiment/client-api";

interface ExperimentDetailProps {
  log: ExperimentLogDetail;
  onBack: () => void;
  onEdit: () => void;
}

export function ExperimentDetail({ log, onBack, onEdit }: ExperimentDetailProps) {
  // 解析已有的AI总结
  const summary = useMemo(() => {
    if (!log.aiSummary) return null;
    try {
      return JSON.parse(log.aiSummary) as AiExperimentSummaryResponse;
    } catch {
      return null;
    }
  }, [log.aiSummary]);

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSummarize() {
    if (loadingSummary) return;
    setLoadingSummary(true);
    try {
      const res = await summarizeExperiment(log.id);
      setSummary(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : "归纳失败，请稍后重试");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function copySummary() {
    if (!summary) return;
    const text = `
# ${log.title} - AI 实验总结

## 核心摘要
${summary.summary}

## 要点高亮
${summary.highlights.map(h => `- ${h}`).join("\n")}

## 异常现象
${summary.anomalies.length > 0 ? summary.anomalies.map(a => `- ${a}`).join("\n") : "无异常现象"}
    `.trim();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
        <button
          onClick={onEdit}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
        >
          编辑记录
        </button>
      </div>

      <div className="rounded-md border p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{log.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            实验日期：{log.experimentDate ? format(new Date(log.experimentDate), "yyyy-MM-dd") : "未填写"}
            ・ 创建时间：{format(new Date(log.createdAt), "yyyy-MM-dd HH:mm")}
          </p>
        </div>

        {/* AI 总结区域 */}
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">AI 实验归纳</h3>
            </div>
            <div className="flex items-center gap-2">
              {summary && (
                <button
                  onClick={copySummary}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "已复制" : "复制总结"}
                </button>
              )}
              <button
                onClick={handleSummarize}
                className="px-3 py-1.5 text-xs rounded-md bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
                disabled={loadingSummary}
              >
                {loadingSummary ? "归纳中…" : summary ? "重新归纳" : "AI 归纳"}
              </button>
            </div>
          </div>

          {summary ? (
            <div className="space-y-3 text-sm text-yellow-900">
              <p>{summary.summary}</p>
              {summary.highlights.length > 0 && (
                <div>
                  <p className="font-medium mb-1">✅ 要点高亮：</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {summary.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.anomalies.length > 0 && (
                <div>
                  <p className="font-medium mb-1">⚠️ 异常现象：</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {summary.anomalies.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-yellow-700">
              点击「AI 归纳」按钮，自动总结实验要点并标记异常现象。
            </p>
          )}
        </div>

        {/* 实验详情 */}
        <div className="space-y-4">
          {log.purpose && (
            <div>
              <h3 className="font-semibold mb-1">实验目的</h3>
              <p className="text-sm whitespace-pre-wrap">{log.purpose}</p>
            </div>
          )}

          {log.parameters && Object.keys(log.parameters).length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">实验参数</h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {Object.entries(log.parameters).map(([key, value]) => (
                  <div key={key} className="rounded-md bg-muted px-3 py-2">
                    <div className="text-xs text-muted-foreground">{key}</div>
                    <div className="text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {log.procedure && (
            <div>
              <h3 className="font-semibold mb-1">实验步骤</h3>
              <p className="text-sm whitespace-pre-wrap">{log.procedure}</p>
            </div>
          )}

          {log.observations && (
            <div>
              <h3 className="font-semibold mb-1">实验现象与记录</h3>
              <p className="text-sm whitespace-pre-wrap">{log.observations}</p>
            </div>
          )}

          {log.conclusion && (
            <div>
              <h3 className="font-semibold mb-1">实验结论</h3>
              <p className="text-sm whitespace-pre-wrap">{log.conclusion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
