"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDataSet } from "@/lib/data/client-api";
import type { DataSetDetail } from "@/lib/data/types";

interface UploadPanelProps {
  onSuccess: (dataset: DataSetDetail, warning?: string) => void;
}

export function UploadPanel({ onSuccess }: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError("");
    try {
      const result = await uploadDataSet(file, (p) => setProgress(p));
      onSuccess(result.dataset, result.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (file) handleFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={onFileChange}
      />
      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">上传 CSV / Excel 文件</h3>
      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
        拖拽文件到此处，或点击按钮选择文件。支持 CSV / .xlsx / .xls 格式，单文件最大 5MB，自动保留前 1000 行数据用于分析。
      </p>
      {error && (
        <div className="mb-4 text-sm text-destructive bg-destructive/10 p-2 rounded">
          <div className="flex items-center justify-center gap-2">
            <X className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
      {uploading ? (
        <div className="mb-4">
          <div className="w-full max-w-xs mx-auto h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">上传并解析中... {progress}%</p>
        </div>
      ) : (
        <Button onClick={() => fileInputRef.current?.click()}>
          选择文件上传
        </Button>
      )}
    </div>
  );
}
