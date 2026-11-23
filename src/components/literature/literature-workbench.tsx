"use client";

import { useState } from "react";
import { UploadPanel } from "./upload-panel";
import { PaperLibrary } from "./paper-library";
import { ReaderView } from "./reader-view";
import { getPaper } from "@/lib/literature/client-api";
import type { PaperDetail } from "@/lib/literature/types";

// 文献助手总编排：文献库（上传 + 列表）与阅读室（速读卡 + 溯源问答）两种视图
export function LiteratureWorkbench() {
  const [activePaper, setActivePaper] = useState<PaperDetail | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  async function handleOpen(id: string) {
    setOpening(true);
    setOpenError(null);
    try {
      const paper = await getPaper(id);
      setActivePaper(paper);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "打开文献失败");
    } finally {
      setOpening(false);
    }
  }

  if (activePaper) {
    return (
      <ReaderView
        paper={activePaper}
        onBack={() => {
          setActivePaper(null);
          setRefreshKey((key) => key + 1);
        }}
        onPaperChange={setActivePaper}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <UploadPanel
          onUploaded={(paper) => {
            setRefreshKey((key) => key + 1);
            setActivePaper(paper);
          }}
        />
        {opening && (
          <p className="text-xs text-muted-foreground">正在打开文献…</p>
        )}
        {openError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {openError}
          </p>
        )}
      </div>
      <PaperLibrary refreshKey={refreshKey} onOpen={(id) => void handleOpen(id)} />
    </div>
  );
}
