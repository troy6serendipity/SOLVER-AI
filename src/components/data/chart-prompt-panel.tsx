"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Wand2 } from "lucide-react";
import { generateChart } from "@/lib/data/client-api";
import type { ChartRecord, DataSetDetail } from "@/lib/data/types";

interface ChartPromptPanelProps {
  dataset: DataSetDetail;
  onChartGenerated: (chart: ChartRecord) => void;
}

export function ChartPromptPanel({ dataset, onChartGenerated }: ChartPromptPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [recommending, setRecommending] = useState(false);

  async function handleGenerate(mode: "prompt" | "recommend") {
    if (mode === "prompt" && prompt.trim() === "") return;
    const setLoading = mode === "prompt" ? setGenerating : setRecommending;
    setLoading(true);
    try {
      const result = await generateChart(dataset.id, { mode, prompt: mode === "prompt" ? prompt : undefined });
      onChartGenerated(result.chart);
      if (mode === "prompt") setPrompt("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  const examples = [
    "画出温度与误差的散点图并分析相关性",
    "按月份统计销售额的折线图",
    "各分类的销量占比柱状图",
    "两个数值字段的相关性热力图"
  ];

  return (
    <div className="border rounded-xl bg-card overflow-hidden mb-6">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI 自然语言出图
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleGenerate("recommend")}
          disabled={recommending || generating}
        >
          <Wand2 className="w-4 h-4 mr-2" />
          {recommending ? "推荐中..." : "AI 推荐图表"}
        </Button>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="输入你的图表需求，如「画出温度与误差的散点图并分析相关性」"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate("prompt")}
            disabled={generating || recommending}
          />
          <Button disabled={!prompt.trim() || generating || recommending} onClick={() => handleGenerate("prompt")}>
            {generating ? "生成中..." : "生成图表"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground py-1">示例：</span>
          {examples.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPrompt(example)}
              className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
