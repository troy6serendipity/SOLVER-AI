"use client";

import { useCallback, useRef, useState } from "react";
import {
  BookMarked,
  CheckCircle2,
  Copy,
  Loader2,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionInput } from "./question-input";
import { ChatPanel, type ChatPanelHandle } from "./chat-panel";
import { WrongQuestionBook } from "./wrong-question-book";
import {
  generateVariant,
  saveWrongQuestion,
} from "@/lib/review/client-api";

type Tab = "chat" | "book";

export function ReviewWorkbench() {
  const [tab, setTab] = useState<Tab>("chat");
  const [question, setQuestion] = useState("");
  const [source, setSource] = useState<"manual" | "ocr">("manual");
  const [analysisRef, setAnalysisRef] = useState("");
  const [streaming, setStreaming] = useState(false);

  const [variantLoading, setVariantLoading] = useState(false);
  const [variantText, setVariantText] = useState<string | null>(null);
  const [variantError, setVariantError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [bookRefreshKey, setBookRefreshKey] = useState(0);

  const chatRef = useRef<ChatPanelHandle>(null);

  const handleAnalysisChange = useCallback((text: string) => {
    setAnalysisRef(text);
  }, []);

  async function handleGenerateVariant() {
    if (!question.trim() || variantLoading) return;
    setVariantLoading(true);
    setVariantError(null);
    setVariantText(null);
    try {
      const result = await generateVariant(question.trim());
      setVariantText(result.question);
    } catch (error) {
      setVariantError(error instanceof Error ? error.message : "变式题生成失败");
    } finally {
      setVariantLoading(false);
    }
  }

  async function handleSaveWrong() {
    if (!question.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const result = await saveWrongQuestion({
        question: question.trim(),
        analysis: analysisRef || undefined,
        source,
      });
      const tagText = result.knowledgePoints.length
        ? result.knowledgePoints.join("、")
        : "未抽取到标签";
      setSaveSuccess(`已收入错题本，知识点：${tagText}`);
      setBookRefreshKey((key) => key + 1);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "收入错题本失败");
    } finally {
      setSaving(false);
    }
  }

  function useVariantAsQuestion() {
    if (!variantText) return;
    setQuestion(variantText);
    setVariantText(null);
    chatRef.current?.startNewChat(variantText);
    setTab("chat");
  }

  function copyVariant() {
    if (!variantText) return;
    void navigator.clipboard.writeText(variantText);
  }

  return (
    <div className="space-y-4">
      {/* 顶部 Tab 切换 */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={tab === "chat" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("chat")}
        >
          <MessagesSquare className="h-4 w-4" />
          解题对话
        </Button>
        <Button
          type="button"
          variant={tab === "book" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("book")}
        >
          <BookMarked className="h-4 w-4" />
          错题本
        </Button>
      </div>

      {tab === "chat" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 左列：题目输入 + 衍生操作 */}
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="text-sm font-semibold">题目输入</h2>
                <QuestionInput
                  question={question}
                  onQuestionChange={setQuestion}
                  onSourceChange={setSource}
                  disabled={streaming}
                />
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!question.trim() || variantLoading}
                    onClick={() => void handleGenerateVariant()}
                  >
                    {variantLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    生成同类变式题
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!question.trim() || saving}
                    onClick={() => void handleSaveWrong()}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BookMarked className="h-4 w-4" />
                    )}
                    收入错题本
                  </Button>
                </div>

                {saveSuccess && (
                  <p className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {saveSuccess}
                  </p>
                )}
                {saveError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {saveError}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 变式题结果 */}
            {variantText && (
              <Card className="border-primary/30">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">同类变式题</h2>
                  </div>
                  <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">
                    {variantText}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={useVariantAsQuestion}
                    >
                      拿去提问
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={copyVariant}
                    >
                      <Copy className="h-4 w-4" />
                      复制
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {variantError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {variantError}
              </p>
            )}
          </div>

          {/* 右列：流式对话 */}
          <div className="h-[640px]">
            <ChatPanel
              ref={chatRef}
              question={question}
              onAnalysisChange={handleAnalysisChange}
              onStreamingChange={setStreaming}
            />
          </div>
        </div>
      ) : (
        <WrongQuestionBook refreshKey={bookRefreshKey} />
      )}
    </div>
  );
}
