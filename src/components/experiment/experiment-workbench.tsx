"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { ExperimentForm } from "./experiment-form";
import { ExperimentList } from "./experiment-list";
import { ExperimentDetail } from "./experiment-detail";
import { ExperimentCompare } from "./experiment-compare";
import { FilterPanel } from "./filter-panel";
import { listExperiments, createExperiment, updateExperiment, deleteExperiment, getExperiment } from "@/lib/experiment/client-api";
import type { ExperimentLogDetail, ExperimentLogListItem } from "../types";

type ViewMode = "list" | "create" | "edit" | "detail" | "compare";

export function ExperimentWorkbench() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [logs, setLogs] = useState<ExperimentLogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentLog, setCurrentLog] = useState<ExperimentLogDetail | null>(null);
  const [compareLogs, setCompareLogs] = useState<ExperimentLogDetail[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 加载实验记录列表
  async function loadLogs() {
    setLoading(true);
    try {
      const data = await listExperiments({
        keyword: keyword.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "加载失败，请刷新页面重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLogs();
  }, [loadLogs]);

  // 筛选
  function handleFilter() {
    loadLogs();
  }

  // 重置筛选
  function handleReset() {
    setKeyword("");
    setStartDate("");
    setEndDate("");
    setTimeout(() => loadLogs(), 0);
  }

  // 选择记录
  function handleSelect(id: string) {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        // 最多选2条
        if (prev.length >= 2) {
          return [prev[1], id];
        }
        return [...prev, id];
      }
    });
  }

  // 查看详情
  async function handleView(id: string) {
    try {
      const log = await getExperiment(id);
      setCurrentLog(log);
      setViewMode("detail");
    } catch (err) {
      alert(err instanceof Error ? err.message : "加载失败");
    }
  }

  // 编辑
  async function handleEdit(id: string) {
    try {
      const log = await getExperiment(id);
      setCurrentLog(log);
      setViewMode("edit");
    } catch (err) {
      alert(err instanceof Error ? err.message : "加载失败");
    }
  }

  // 删除
  async function handleDelete(id: string) {
    await deleteExperiment(id);
    setLogs(prev => prev.filter(l => l.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
  }

  // 对比
  async function handleCompare() {
    if (selectedIds.length !== 2) return;
    try {
      const [log1, log2] = await Promise.all([
        getExperiment(selectedIds[0]),
        getExperiment(selectedIds[1]),
      ]);
      setCompareLogs([log1, log2]);
      setViewMode("compare");
    } catch (err) {
      alert(err instanceof Error ? err.message : "加载失败");
    }
  }

  // 提交创建
  async function handleCreate(data: Partial<ExperimentLogDetail>) {
    setSubmitting(true);
    try {
      await createExperiment(data);
      await loadLogs();
      setViewMode("list");
    } finally {
      setSubmitting(false);
    }
  }

  // 提交更新
  async function handleUpdate(data: Partial<ExperimentLogDetail>) {
    if (!currentLog) return;
    setSubmitting(true);
    try {
      await updateExperiment(currentLog.id, data);
      await loadLogs();
      // 重新加载详情
      const updated = await getExperiment(currentLog.id);
      setCurrentLog(updated);
      setViewMode("detail");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">实验记录管理</h1>
        {viewMode === "list" && (
          <button
            onClick={() => setViewMode("create")}
            className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            新建实验
          </button>
        )}
      </div>

      {viewMode === "list" && (
        <>
          <FilterPanel
            keyword={keyword}
            onKeywordChange={setKeyword}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            onFilter={handleFilter}
            onReset={handleReset}
            selectedCount={selectedIds.length}
            onCompare={handleCompare}
            showCompare
          />

          {loading ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              加载中…
            </div>
          ) : (
            <ExperimentList
              logs={logs}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              showCheckbox
            />
          )}
        </>
      )}

      {viewMode === "create" && (
        <div className="rounded-md border p-6">
          <h2 className="text-xl font-semibold mb-6">新建实验记录</h2>
          <ExperimentForm
            onSubmit={handleCreate}
            submitText="创建记录"
            isLoading={submitting}
          />
          <div className="mt-4">
            <button
              onClick={() => setViewMode("list")}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              ← 返回列表
            </button>
          </div>
        </div>
      )}

      {viewMode === "edit" && currentLog && (
        <div className="rounded-md border p-6">
          <h2 className="text-xl font-semibold mb-6">编辑实验记录</h2>
          <ExperimentForm
            initialData={currentLog}
            onSubmit={handleUpdate}
            submitText="保存修改"
            isLoading={submitting}
          />
          <div className="mt-4">
            <button
              onClick={() => setViewMode("detail")}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              ← 返回详情
            </button>
          </div>
        </div>
      )}

      {viewMode === "detail" && currentLog && (
        <ExperimentDetail
          log={currentLog}
          onBack={() => setViewMode("list")}
          onEdit={() => setViewMode("edit")}
        />
      )}

      {viewMode === "compare" && compareLogs.length === 2 && (
        <div>
          <button
            onClick={() => setViewMode("list")}
            className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            ← 返回列表
          </button>
          <ExperimentCompare log1={compareLogs[0]} log2={compareLogs[1]} />
        </div>
      )}
    </div>
  );
}
