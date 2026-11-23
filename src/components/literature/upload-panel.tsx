"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadPaper } from "@/lib/literature/client-api";
import type { PaperDetail } from "@/lib/literature/types";

interface UploadPanelProps {
  onUploaded: (paper: PaperDetail) => void;
}

// PDF 上传区：选择文件 + 标签 + 进度反馈，后端完成解析与速读卡生成
export function UploadPanel({ onUploaded }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    setError(null);
    if (!selected) return;
    if (
      selected.type !== "application/pdf" &&
      !selected.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("仅支持 PDF 文件");
      setFile(null);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("PDF 文件不能超过 10MB");
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function handleUpload() {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const tags = tagInput
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean);
      const result = await uploadPaper(file, tags, setProgress);
      setProgress(100);
      onUploaded(result.paper);
      setFile(null);
      setTagInput("");
      if (inputRef.current) inputRef.current.value = "";
      if (result.warning) setError(result.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-2">
        <FileUp className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">上传 PDF 文献</h2>
      </div>

      <div className="mt-3 space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <FileUp className="h-4 w-4" />
          选择 PDF 文件
        </Button>

        {file && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="truncate">
              {file.name}
              <span className="ml-2 text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="移除文件"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Input
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          placeholder="标签（逗号分隔，如：大模型,综述）"
          disabled={uploading}
          aria-label="文献标签"
        />

        {uploading && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              上传与解析中… {progress}%
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {error}
          </p>
        )}

        <Button
          type="button"
          onClick={() => void handleUpload()}
          disabled={!file || uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
          上传并解析
        </Button>
      </div>
    </div>
  );
}
