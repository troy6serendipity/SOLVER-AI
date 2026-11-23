"use client";

import { useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeedCards } from "./speed-cards";
import { SourcePanel, type SourcePanelHandle } from "./source-panel";
import { CitationChat } from "./citation-chat";
import type { PaperDetail } from "@/lib/literature/types";

interface ReaderViewProps {
  paper: PaperDetail;
  onBack: () => void;
  onPaperChange: (paper: PaperDetail) => void;
}

// 阅读室：顶部速读卡 + 下方左右分栏（左原文段落 / 右溯源问答）
export function ReaderView({
  paper,
  onBack,
  onPaperChange,
}: ReaderViewProps) {
  const sourceRef = useRef<SourcePanelHandle>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          返回文献库
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{paper.title}</h2>
          <p className="text-xs text-muted-foreground">
            {paper.filePath}
            {paper.pageCount ? ` · ${paper.pageCount} 页` : ""} ·{" "}
            {paper.paragraphs.length} 个段落
          </p>
        </div>
      </div>

      <SpeedCards paper={paper} onPaperChange={onPaperChange} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-[620px]">
          <SourcePanel ref={sourceRef} paragraphs={paper.paragraphs} />
        </div>
        <div className="h-[620px]">
          <CitationChat
            paperId={paper.id}
            paragraphs={paper.paragraphs}
            onCitation={(index) => sourceRef.current?.highlight(index)}
          />
        </div>
      </div>
    </div>
  );
}
