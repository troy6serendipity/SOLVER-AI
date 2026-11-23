"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { BookOpenText } from "lucide-react";
import type { PaperParagraph } from "@/lib/literature/types";

export interface SourcePanelHandle {
  /** 滚动到指定段落并高亮 */
  highlight: (index: number) => void;
}

interface SourcePanelProps {
  paragraphs: PaperParagraph[];
}

// 左侧原文段落区：段落编号固定展示，支持被引用标签点击后滚动+高亮
export const SourcePanel = forwardRef<SourcePanelHandle, SourcePanelProps>(
  function SourcePanel({ paragraphs }, ref) {
    const elementMap = useRef(new Map<number, HTMLElement>());
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useImperativeHandle(ref, () => ({
      highlight(index: number) {
        const element = elementMap.current.get(index);
        if (!element) return;
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setActiveIndex(index);
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setActiveIndex(null), 3000);
      },
    }));

    return (
      <div className="flex h-full flex-col rounded-xl border bg-white">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <BookOpenText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">原文段落</span>
          <span className="ml-auto text-xs text-muted-foreground">
            共 {paragraphs.length} 段
          </span>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {paragraphs.map((paragraph) => {
            const active = activeIndex === paragraph.index;
            return (
              <article
                key={paragraph.index}
                ref={(node) => {
                  if (node) elementMap.current.set(paragraph.index, node);
                  else elementMap.current.delete(paragraph.index);
                }}
                className={`rounded-lg border p-3 transition-colors ${
                  active
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-transparent bg-muted/30"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    段落 {paragraph.index}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                  {paragraph.text}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    );
  }
);
