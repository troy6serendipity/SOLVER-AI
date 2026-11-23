"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Edit, Trash2, FileText, Lightbulb } from "lucide-react";
import type { ExperimentLogListItem } from "../types";

interface ExperimentListProps {
  logs: ExperimentLogListItem[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  selectedIds: string[];
  onSelect: (id: string) => void;
  showCheckbox?: boolean;
}

export function ExperimentList({
  logs,
  onView,
  onEdit,
  onDelete,
  selectedIds,
  onSelect,
  showCheckbox = false,
}: ExperimentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("确定要删除这条实验记录吗？删除后无法恢复。")) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {logs.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          暂无实验记录，点击右上角「新建实验」创建第一条记录吧
        </div>
      ) : (
        logs.map((log) => (
          <div
            key={log.id}
            className="rounded-md border p-4 hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => onView(log.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                {showCheckbox && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(log.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelect(log.id);
                    }}
                    className="mt-1"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{log.title}</h3>
                    {log.hasAiSummary && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs">
                        <Lightbulb className="h-3 w-3" />
                        AI 已归纳
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      实验日期：{log.experimentDate ? format(new Date(log.experimentDate), "yyyy-MM-dd") : "未填写"}
                    </span>
                    <span>
                      创建时间：{format(new Date(log.createdAt), "yyyy-MM-dd HH:mm")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(log.id);
                  }}
                  className="p-2 text-muted-foreground hover:text-primary"
                  title="编辑"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(log.id, e)}
                  className="p-2 text-muted-foreground hover:text-destructive"
                  title="删除"
                  disabled={deletingId === log.id}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
