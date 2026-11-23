"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  deleteWrongQuestion,
  listWrongQuestions,
  updateMastery,
} from "@/lib/review/client-api";
import {
  MASTERY_LABELS,
  SOURCE_LABELS,
  type Mastery,
  type WrongQuestionRecord,
} from "@/lib/review/types";

const MASTERY_STYLES: Record<Mastery, string> = {
  new: "bg-rose-50 text-rose-600 border-rose-200",
  learning: "bg-amber-50 text-amber-600 border-amber-200",
  mastered: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const MASTERY_ORDER: Mastery[] = ["new", "learning", "mastered"];

function parseFormulas(formulas: string | null): string[] {
  if (!formulas) return [];
  try {
    const parsed = JSON.parse(formulas) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function WrongQuestionBook({ refreshKey }: { refreshKey: number }) {
  const [records, setRecords] = useState<WrongQuestionRecord[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState("");
  const [masteryFilter, setMasteryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWrongQuestions({
        knowledgePoint: tagFilter || undefined,
        mastery: masteryFilter || undefined,
      });
      setRecords(data.records);
      // 标签全集以服务端返回为准（不受当前筛选影响）
      setAllTags((prev) =>
        prev.length >= data.tags.length && tagFilter === "" ? prev : data.tags
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载错题本失败");
    } finally {
      setLoading(false);
    }
  }, [tagFilter, masteryFilter]);

  useEffect(() => {
    void load();
    // refreshKey 变化时（新收入错题）强制刷新
  }, [load, refreshKey]);

  const summary = useMemo(() => {
    const count = (mastery: Mastery) =>
      records.filter((record) => (record.mastery ?? "new") === mastery).length;
    return {
      new: count("new"),
      learning: count("learning"),
      mastered: count("mastered"),
    };
  }, [records]);

  async function handleMasteryChange(id: string, mastery: Mastery) {
    setBusyId(id);
    try {
      await updateMastery(id, mastery);
      setRecords((prev) =>
        prev.map((record) =>
          record.id === id ? { ...record, mastery } : record
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新标记失败");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("确定删除这条错题吗？此操作不可撤销。")) return;
    setBusyId(id);
    try {
      await deleteWrongQuestion(id);
      setRecords((prev) => prev.filter((record) => record.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* 筛选工具栏 */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BookMarked className="h-4 w-4 text-primary" />
          错题本
        </div>
        <select
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
          className="h-9 rounded-md border bg-transparent px-2 text-sm"
          aria-label="按知识点筛选"
        >
          <option value="">全部知识点</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          value={masteryFilter}
          onChange={(event) => setMasteryFilter(event.target.value)}
          className="h-9 rounded-md border bg-transparent px-2 text-sm"
          aria-label="按掌握度筛选"
        >
          <option value="">全部掌握度</option>
          {MASTERY_ORDER.map((mastery) => (
            <option key={mastery} value={mastery}>
              {MASTERY_LABELS[mastery]}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void load()}
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          待复习 {summary.new} · 复习中 {summary.learning} · 已掌握{" "}
          {summary.mastered}
        </span>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          加载中…
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          暂无错题。在「解题对话」中点击「收入错题本」，AI 会自动提取知识点与公式。
        </div>
      ) : (
        <ul className="space-y-3">
          {records.map((record) => {
            const mastery = (record.mastery ?? "new") as Mastery;
            const tags = record.knowledgePoint
              ? record.knowledgePoint.split(",").filter(Boolean)
              : [];
            const formulas = parseFormulas(record.formulas);
            const expanded = expandedId === record.id;
            return (
              <li key={record.id} className="rounded-xl border bg-white">
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={MASTERY_STYLES[mastery]}>
                      {MASTERY_LABELS[mastery]}
                    </Badge>
                    <Badge variant="secondary">{record.subject}</Badge>
                    {record.source && (
                      <Badge variant="outline">
                        {SOURCE_LABELS[record.source] ?? record.source}
                      </Badge>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(record.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {record.question}
                  </p>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-primary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {expanded && (
                    <div className="space-y-3 rounded-lg bg-muted/30 p-3 text-sm">
                      {formulas.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-semibold text-muted-foreground">
                            核心公式
                          </p>
                          <ul className="list-disc space-y-1 pl-5">
                            {formulas.map((formula, index) => (
                              <li key={index} className="font-mono text-xs">
                                {formula}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {record.analysis && (
                        <div>
                          <p className="mb-1 text-xs font-semibold text-muted-foreground">
                            历史解题思路
                          </p>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed">
                            {record.analysis}
                          </p>
                        </div>
                      )}
                      {record.answer && (
                        <div>
                          <p className="mb-1 text-xs font-semibold text-muted-foreground">
                            参考答案
                          </p>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed">
                            {record.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedId(expanded ? null : record.id)
                      }
                    >
                      {expanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {expanded ? "收起详情" : "查看思路与公式"}
                    </Button>
                    <div className="ml-auto flex items-center gap-1.5">
                      {MASTERY_ORDER.map((value) => (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={mastery === value ? "default" : "outline"}
                          disabled={busyId === record.id}
                          onClick={() => void handleMasteryChange(record.id, value)}
                        >
                          {MASTERY_LABELS[value]}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busyId === record.id}
                        onClick={() => void handleDelete(record.id)}
                        aria-label="删除错题"
                      >
                        {busyId === record.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
