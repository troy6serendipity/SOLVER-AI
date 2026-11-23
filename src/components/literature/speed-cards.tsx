"use client";

import { useState } from "react";
import {
  FlaskConical,
  Languages,
  Lightbulb,
  Loader2,
  RefreshCw,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  regenerateSummary,
  translateCards,
} from "@/lib/literature/client-api";
import type { PaperDetail, SummaryCards } from "@/lib/literature/types";

interface SpeedCardsProps {
  paper: PaperDetail;
  onPaperChange: (paper: PaperDetail) => void;
}

const CARD_META: Array<{
  key: keyof SummaryCards;
  title: string;
  icon: typeof Target;
  accent: string;
}> = [
  { key: "background", title: "研究背景", icon: Lightbulb, accent: "bg-indigo-50 text-indigo-600" },
  { key: "methods", title: "核心方法", icon: Target, accent: "bg-emerald-50 text-emerald-600" },
  { key: "results", title: "实验结果", icon: FlaskConical, accent: "bg-amber-50 text-amber-600" },
  { key: "limitations", title: "局限性", icon: RefreshCw, accent: "bg-rose-50 text-rose-600" },
];

function parseSummary(paper: PaperDetail): SummaryCards | null {
  if (!paper.summary) return null;
  try {
    return JSON.parse(paper.summary) as SummaryCards;
  } catch {
    return null;
  }
}

// 三分钟速读卡：四张结构化卡片 + 一键中英翻译 + 手动重新生成
export function SpeedCards({ paper, onPaperChange }: SpeedCardsProps) {
  const cards = parseSummary(paper);
  const [busy, setBusy] = useState<"summary" | "zh" | "en" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [translation, setTranslation] = useState<string | null>(
    paper.translation ? paper.translation.zh ?? paper.translation.en ?? null : null
  );

  async function handleRegenerate() {
    setBusy("summary");
    setError(null);
    try {
      const summary = await regenerateSummary(paper.id);
      onPaperChange({ ...paper, summary: JSON.stringify(summary) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "速读卡生成失败");
    } finally {
      setBusy(null);
    }
  }

  async function handleTranslate(target: "zh" | "en") {
    setBusy(target);
    setError(null);
    try {
      const result = await translateCards(paper.id, target);
      setTranslation(result.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "翻译失败");
    } finally {
      setBusy(null);
    }
  }

  if (!cards) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            暂未生成速读卡，可手动触发轻量模型生成。
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleRegenerate()}
            disabled={busy !== null}
          >
            {busy === "summary" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            生成速读卡
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">三分钟速读卡</h2>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleTranslate("zh")}
            disabled={busy !== null}
          >
            {busy === "zh" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Languages className="h-3.5 w-3.5" />
            )}
            中文译文
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleTranslate("en")}
            disabled={busy !== null}
          >
            {busy === "en" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Languages className="h-3.5 w-3.5" />
            )}
            English
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleRegenerate()}
            disabled={busy !== null}
          >
            {busy === "summary" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            重新生成
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {CARD_META.map((meta) => {
          const Icon = meta.icon;
          return (
            <Card key={meta.key}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.accent}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold">{meta.title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {cards[meta.key]}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {translation && (
        <Card className="border-primary/30">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">译文</h3>
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed">
              {translation}
            </p>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
