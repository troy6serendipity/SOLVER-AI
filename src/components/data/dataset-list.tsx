"use client";

import { useEffect, useState } from "react";
import { listDataSets, deleteDataSet } from "@/lib/data/client-api";
import type { DataSetListItem } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Trash2, FileSpreadsheet, Calendar, BarChart2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface DatasetListProps {
  onSelect: (id: string) => void;
}

export function DatasetList({ onSelect }: DatasetListProps) {
  const [datasets, setDatasets] = useState<DataSetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadList() {
    setLoading(true);
    try {
      const res = await listDataSets();
      setDatasets(res.datasets);
    } catch (error) {
      alert(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("确定要删除该数据集吗？关联的图表也会一并删除。")) return;
    setDeletingId(id);
    try {
      await deleteDataSet(id);
      setDatasets(datasets.filter((d) => d.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  if (datasets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>还没有上传过数据集。上传 CSV / Excel 文件开始分析吧。</p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          我的数据集
        </h3>
        <Button size="sm" variant="secondary" onClick={loadList}>刷新</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-muted/30">
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium">名称</th>
              <th className="px-4 py-3 text-center text-sm font-medium">行数</th>
              <th className="px-4 py-3 text-center text-sm font-medium">列数</th>
              <th className="px-4 py-3 text-center text-sm font-medium">图表数</th>
              <th className="px-4 py-3 text-center text-sm font-medium">上传时间</th>
              <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((dataset) => (
              <tr
                key={dataset.id}
                className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSelect(dataset.id)}
              >
                <td className="px-4 py-3 font-medium">{dataset.name}</td>
                <td className="px-4 py-3 text-center font-mono text-sm">{dataset.rowCount}</td>
                <td className="px-4 py-3 text-center font-mono text-sm">{dataset.columnCount}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-sm">
                    <BarChart2 className="w-3.5 h-3.5 text-primary" />
                    {dataset.chartCount ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(dataset.createdAt), { addSuffix: true, locale: zhCN })}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(dataset.id, e)}
                    disabled={deletingId === dataset.id}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

