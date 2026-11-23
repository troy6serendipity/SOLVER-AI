"use client";

import { useState } from "react";
import { FileUp, Download, Copy, Check } from "lucide-react";
import { optimizeResume } from "@/lib/career/client-api";
import type { ResumeOptimizeResponse } from "@/lib/career/types";

export function ResumeOptimizeTab() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResumeOptimizeResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleOptimize() {
    if (!resumeText.trim() || !jdText.trim()) {
      alert("请填写简历内容和目标岗位JD");
      return;
    }
    setLoading(true);
    try {
      const res = await optimizeResume({
        resumeText: resumeText.trim(),
        jdText: jdText.trim(),
      });
      setResult(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : "优化失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function copyOptimized() {
    if (!result) return;
    await navigator.clipboard.writeText(result.optimizedFullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadOptimized() {
    if (!result) return;
    const blob = new Blob([result.optimizedFullText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "优化后简历.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">简历内容</label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="w-full rounded-md border px-3 py-2 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="请粘贴您的简历文本内容，支持Markdown格式"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">目标岗位JD</label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            className="w-full rounded-md border px-3 py-2 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="请粘贴目标岗位的招聘要求（JD）"
          />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleOptimize}
          disabled={loading || !resumeText.trim() || !jdText.trim()}
          className="rounded-md bg-primary px-6 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "优化中…" : "开始优化简历"}
        </button>
      </div>

      {result && (
        <div className="space-y-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">优化结果</h3>
              <p className="text-sm text-muted-foreground mt-1">
                简历匹配度：<span className="font-bold text-primary">{result.overallScore} 分</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyOptimized}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border hover:bg-muted"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "已复制" : "复制全文"}
              </button>
              <button
                onClick={downloadOptimized}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-green-50 text-green-700 hover:bg-green-100"
              >
                <Download className="h-4 w-4" />
                下载简历
              </button>
            </div>
          </div>

          <div className="rounded-md bg-muted p-4">
            <p className="text-sm">{result.overallAdvice}</p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">逐条优化建议</h4>
            {result.suggestions.length > 0 ? (
              result.suggestions.map((suggestion, index) => (
                <div key={index} className="rounded-md border p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-red-600">优化前</p>
                      <p className="text-sm bg-red-50 p-2 rounded-md">{suggestion.original}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-600">优化后</p>
                      <p className="text-sm bg-green-50 p-2 rounded-md">{suggestion.optimized}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">修改原因</p>
                    <p className="text-sm">{suggestion.reason}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">暂无逐条优化建议，可尝试更详细的简历和JD内容。</p>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">完整优化后简历</h4>
            <pre className="rounded-md border p-4 text-sm whitespace-pre-wrap bg-muted max-h-[400px] overflow-auto">
              {result.optimizedFullText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
