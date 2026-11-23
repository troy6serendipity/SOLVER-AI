"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Lightbulb,
  Loader2,
  SendHorizonal,
  Square,
  HelpCircle,
  Shuffle,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamReviewChat } from "@/lib/review/client-api";
import type { ChatMessage } from "@/lib/review/types";

export interface ChatPanelHandle {
  /** 用指定题目开启一段全新对话 */
  startNewChat: (questionText: string) => void;
}

interface ChatPanelProps {
  question: string;
  onAnalysisChange: (latestAssistantText: string) => void;
  onStreamingChange?: (streaming: boolean) => void;
}

// 快捷追问按钮
const QUICK_ASKKS = [
  { label: "为什么这样想？", icon: HelpCircle },
  { label: "换一种解法", icon: Shuffle },
  { label: "如果条件变了会怎样？", icon: GitBranch },
];

function buildSystemPrompt(hintsOnly: boolean): string {
  if (hintsOnly) {
    return [
      "你是融研AI的复习助手，当前严格处于「只要思路，不直接给答案」模式：",
      "1. 绝不直接给出最终答案或完整解题过程；",
      "2. 先点明题目涉及的知识点，再通过分步追问引导学生自己推导；",
      "3. 每轮只给一个提示或一个引导性问题，等学生回应后再继续下一步；",
      "4. 主动提醒常见易错点，但关键计算与结论必须留给学生完成。",
    ].join("\n");
  }
  return [
    "你是融研AI的复习助手，学生已切换到「允许完整解答」模式：",
    "可以给出完整参考答案与解题过程，但必须先讲清解题思路与步骤，",
    "并标注涉及的知识点、核心公式与易错点。",
  ].join("\n");
}

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(
  function ChatPanel({ question, onAnalysisChange, onStreamingChange }, ref) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [hintsOnly, setHintsOnly] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      onStreamingChange?.(streaming);
    }, [streaming, onStreamingChange]);

    useEffect(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, [messages, streaming]);

    useImperativeHandle(ref, () => ({
      startNewChat(questionText: string) {
        abortRef.current?.abort();
        setMessages([]);
        setError(null);
        onAnalysisChange("");
        void sendMessage(questionText, true);
      },
    }));

    async function sendMessage(text: string, isInitialQuestion = false) {
      const content = text.trim();
      if (!content || streaming) return;

      // 首轮对话把题干作为用户消息；后续轮次直接追加
      const nextMessages: ChatMessage[] = isInitialQuestion
        ? [{ role: "user", content }]
        : [...messages, { role: "user", content }];
      setMessages(nextMessages);
      setInput("");
      setError(null);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      let assistantText = "";

      // 先插入空的助手消息，随流式分块持续更新
      setMessages([...nextMessages, { role: "assistant", content: "" }]);

      try {
        await streamReviewChat({
          messages: nextMessages,
          system: buildSystemPrompt(hintsOnly),
          signal: controller.signal,
          onDelta: (delta) => {
            assistantText += delta;
            setMessages([
              ...nextMessages,
              { role: "assistant", content: assistantText },
            ]);
          },
        });
        onAnalysisChange(assistantText);
      } catch (err) {
        if (controller.signal.aborted) {
          // 用户主动中止：保留已生成内容
          onAnalysisChange(assistantText);
          if (!assistantText) {
            setMessages(nextMessages);
          }
        } else {
          setError(err instanceof Error ? err.message : "对话请求失败");
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    }

    function stopStreaming() {
      abortRef.current?.abort();
    }

    const canStart = question.trim().length > 0 && !streaming;

    return (
      <div className="flex h-full flex-col rounded-xl border bg-white">
        {/* 头部：模式开关 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">追问式解题</span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              role="switch"
              aria-checked={hintsOnly}
              onClick={() => setHintsOnly((value) => !value)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                hintsOnly ? "bg-primary" : "bg-muted-foreground/40"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  hintsOnly ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            {hintsOnly ? "只要思路，不直接给答案" : "允许完整解答"}
          </label>
        </div>

        {/* 消息区 */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <HelpCircle className="h-8 w-8 text-muted-foreground/40" />
              <p>输入题目后点击「开始引导解题」</p>
              <p className="text-xs">
                默认思路模式：AI 只追问引导，不直接给答案
              </p>
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
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground"
                }`}
              >
                {message.content || (
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

        {/* 快捷追问 */}
        <div className="flex flex-wrap gap-2 border-t px-4 pt-3">
          {QUICK_ASKKS.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.label}
                type="button"
                variant="outline"
                size="sm"
                disabled={streaming || messages.length === 0}
                onClick={() => void sendMessage(item.label)}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            );
          })}
        </div>

        {/* 输入区 */}
        <div className="space-y-2 p-4">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder="继续追问，或输入你的想法……（Enter 发送，Shift+Enter 换行）"
            className="min-h-[64px]"
            disabled={streaming}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canStart}
              onClick={() => {
                if (question.trim()) void sendMessage(question.trim(), true);
              }}
            >
              <SendHorizonal className="h-4 w-4" />
              开始引导解题
            </Button>
            {streaming ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={stopStreaming}
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
                发送
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
