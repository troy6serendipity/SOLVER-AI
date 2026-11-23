"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { recognizeImage } from "@/lib/review/client-api";

interface QuestionInputProps {
  question: string;
  onQuestionChange: (value: string) => void;
  onSourceChange: (source: "manual" | "ocr") => void;
  disabled?: boolean;
}

// 题目输入区：文字粘贴 + 图片上传预览 + OCR 预留（识别结果可手动补充/修改）
export function QuestionInput({
  question,
  onQuestionChange,
  onSourceChange,
  disabled,
}: QuestionInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setOcrHint("请选择图片文件（PNG / JPG 等）");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setOcrHint("图片不能超过 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      setOcrHint(null);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageDataUrl(null);
    setOcrText("");
    setOcrHint(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleOcr() {
    if (!imageDataUrl) return;
    setOcrLoading(true);
    setOcrHint(null);
    try {
      const result = await recognizeImage(imageDataUrl);
      if ("unavailable" in result) {
        // OCR 服务未配置：引导用户在可编辑文本框中手动补录
        setOcrHint(result.message);
        setOcrText((prev) => prev ?? "");
      } else {
        setOcrText(result.text);
        onSourceChange("ocr");
      }
    } catch (error) {
      setOcrHint(error instanceof Error ? error.message : "OCR 调用失败");
    } finally {
      setOcrLoading(false);
    }
  }

  function applyOcrText() {
    const text = ocrText.trim();
    if (!text) return;
    onQuestionChange(question ? `${question}\n${text}` : text);
    onSourceChange("ocr");
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        disabled={disabled}
        placeholder="粘贴或输入题目文字，例如：求 lim(x→0) sin(x)/x 的极限……"
        className="min-h-[110px] resize-y"
        aria-label="题目文字"
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <ImagePlus className="h-4 w-4" />
          上传题目图片
        </Button>
        {imageDataUrl && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleOcr}
              disabled={disabled || ocrLoading}
            >
              {ocrLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanText className="h-4 w-4" />
              )}
              OCR 识别
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeImage}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
              移除图片
            </Button>
          </>
        )}
      </div>

      {imageDataUrl && (
        <div className="rounded-lg border bg-muted/30 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="题目图片预览"
            className="max-h-48 rounded-md border bg-white object-contain"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            图片仅在本地预览，不会上传保存；识别文字确认后进入题干。
          </p>

          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              识别文字（可手动补充 / 修改）
            </label>
            <Textarea
              value={ocrText}
              onChange={(event) => setOcrText(event.target.value)}
              disabled={disabled}
              placeholder="点击「OCR 识别」自动填充；服务未配置时可在此手动录入图片中的题目文字"
              className="min-h-[72px] bg-white"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={applyOcrText}
                disabled={disabled || !ocrText.trim()}
              >
                填入题干
              </Button>
              {ocrHint && (
                <span className="text-xs text-amber-600">{ocrHint}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
