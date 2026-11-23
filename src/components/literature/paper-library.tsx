"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  deletePaper,
  listPapers,
  updatePaper,
} from "@/lib/literature/client-api";
import type { PaperListItem } from "@/lib/literature/types";

interface PaperLibraryProps {
  refreshKey: number;
  onOpen: (id: string) => void;
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

// 文献库：关键词检索 + 标签/收藏筛选 + 标签编辑 + 收藏 + 删除
export function PaperLibrary({ refreshKey, onOpen }: PaperLibraryProps) {
  const [records, setRecords] = useState<PaperListItem[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPapers({
        keyword: keyword || undefined,
        favorite: favoriteOnly || undefined,
        tag: tagFilter || undefined,
      });
      setRecords(data.records);
      setAllTags(data.tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载文献库失败");
    } finally {
      setLoading(false);
    }
  }, [keyword, favoriteOnly, tagFilter]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function toggleFavorite(record: PaperListItem) {
    setBusyId(record.id);
    try {
      await updatePaper(record.id, { favorite: !record.favorite });
      setRecords((prev) =>
        prev.map((item) =>
          item.id === record.id
            ? { ...item, favorite: !item.favorite }
            : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "收藏更新失败");
    } finally {
      setBusyId(null);
    }
  }

  async function saveTags(id: string) {
    const tags = tagDraft
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    setBusyId(id);
    try {
      await updatePaper(id, { tags });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "标签保存失败");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("确定删除这篇文献及其解析内容吗？此操作不可撤销。")) return;
    setBusyId(id);
    try {
      await deletePaper(id);
      setRecords((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="按标题 / 摘要 / 全文关键词检索"
            className="pl-9"
            aria-label="关键词检索"
          />
        </div>
        <select
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
          className="h-9 rounded-md border bg-transparent px-2 text-sm"
          aria-label="按标签筛选"
        >
          <option value="">全部标签</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant={favoriteOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setFavoriteOnly((value) => !value)}
        >
          <Star className="h-4 w-4" />
          仅看收藏
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
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
          没有匹配的文献。上传一篇 PDF 开始速读吧。
        </div>
      ) : (
        <ul className="space-y-3">
          {records.map((record) => {
            const tags = parseTags(record.tags);
            return (
              <li key={record.id} className="rounded-xl border bg-white">
                <div className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpen(record.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <h3 className="truncate text-sm font-semibold hover:text-primary">
                        {record.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {record.filePath}
                        {record.pageCount ? ` · ${record.pageCount} 页` : ""}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(record)}
                      disabled={busyId === record.id}
                      className="shrink-0"
                      aria-label={record.favorite ? "取消收藏" : "收藏"}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          record.favorite
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/50"
                        }`}
                      />
                    </button>
                  </div>

                  {editingId === record.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={tagDraft}
                        onChange={(event) => setTagDraft(event.target.value)}
                        placeholder="输入标签，逗号分隔"
                        className="h-8 max-w-xs text-xs"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === record.id}
                        onClick={() => void saveTags(record.id)}
                      >
                        保存标签
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        取消
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tags.length > 0 ? (
                        tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-primary">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          暂无标签
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditingId(record.id);
                          setTagDraft(tags.join(","));
                        }}
                      >
                        编辑标签
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onOpen(record.id)}
                    >
                      打开阅读
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busyId === record.id}
                      onClick={() => void handleDelete(record.id)}
                      aria-label="删除文献"
                    >
                      {busyId === record.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
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
