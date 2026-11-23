"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessagesSquare, SendHorizonal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamPaperAsk } from "@/lib/literature/client-api";
import type { PaperParagraph } from "@/lib/literature/types";

interface CitationChatProps {
  paperId: string;
  paragraphs: PaperParagraph[];
  onCitation: (paragraphIndex: number) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CITATION_PATTERN = /\[段落\s*(\d+)\]/g;

/** 把含 [段落 N] 的文本渲染为「文字 + 可点击引用标签」混合节点 */
function renderWithCitations(
  text: string,
  onCitation: (index: number) => void,
  validIndexes: Set<number>
) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CITATION_PATTERN.lastIndex = 0;

  while ((match = CITATION_PATTERN.exec(text)) !== null) {
    const paragraphIndex = Number(match[1]);
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const valid = validIndexes.has(paragraphIndex);
    nodes.push(
      <button
        key={`cite-${match.index}-${paragraphIndex}`}
        type="button"
        disabled={!valid}
        onClick={() => valid && onCitation(paragraphIndex)}
        title={valid ? "点击查看原文段落" : "原文中不存在该段落"}
        className={`mx-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold align-baseline ${
          valid
            ? "bg-primary/10 text-primary hover:bg-primary/20"
            : "bg-muted text-muted-foreground line-through"
        }`}
      >
        段落 {paragraphIndex}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// 右侧溯源问答对话区
export function CitationChat({
  paperId,
  paragraphs,
  onCitation,
}: CitationChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const validIndexes = new Set(paragraphs.map((paragraph) => paragraph.index));

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming]);

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question || streaming) return;

    const history = messages.map((message) => ({ ...message }));
    const nextMessages: ChatMessage[] = [
      ...history,
      { role: "user", content: question },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantText = "";
    setMessages([...nextMessages, { role: "assistant", content: "" }]);

    try {
      await streamPaperAsk({
        paperId,
        question,
        history,
        signal: controller.signal,
        onDelta: (delta) => {
          assistantText += delta;
          setMessages([
            ...nextMessages,
            { role: "assistant", content: assistantText },
          ]);
        },
      });
    } catch (err) {
      if (controller.signal.aborted) {
        if (!assistantText) setMessages(nextMessages);
      } else {
        setError(err instanceof Error ? err.message : "问答请求失败");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="flex h-full flex-col rounded-xl border bg-white">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <MessagesSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">溯源问答</span>
        <span className="ml-auto text-xs text-muted-foreground">
          回答均标注 [段落 N] 引用
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessagesSquare className="h-8 w-8 text-muted-foreground/40" />
            <p>基于左侧原文提问，AI 只依据文献内容回答并附段落引用</p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {["这篇论文主要解决什么问题？", "核心方法的创新点是什么？"].map(
                (suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void sendMessage(suggestion)}
                  >
                    {suggestion}
                  </Button>
                )
              )}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-foreground"
              }`}
            >
              {message.content ? (
                message.role === "assistant" ? (
                  <div className="whitespace-pre-wrap">
                    {renderWithCitations(
                      message.content,
                      onCitation,
                      validIndexes
                    )}
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{message.content}</span>
                )
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="space-y-2 border-t p-4">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage(input);
            }
          }}
          placeholder="针对这篇文献提问……（Enter 发送，Shift+Enter 换行）"
          className="min-h-[60px]"
          disabled={streaming}
        />
        <div className="flex justify-end">
          {streaming ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => abortRef.current?.abort()}
            >
              <Square className="h-3.5 w-3.5" />
              停止生成
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!input.trim()}
              onClick={() => void sendMessage(input)}
            >
              <SendHorizonal className="h-4 w-4" />
              提问
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
