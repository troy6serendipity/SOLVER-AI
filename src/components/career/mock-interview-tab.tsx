"use client";

import { useState, useRef, useEffect } from "react";
import { Send, StopCircle, ThumbsUp, AlertTriangle, Download, Copy } from "lucide-react";
import { startInterview, replyInterview, endInterview } from "@/lib/career/client-api";
import type { InterviewMessage, InterviewReview, InterviewType } from "@/lib/career/types";

export function MockInterviewTab() {
  const [step, setStep] = useState<"setup" | "interview" | "review">("setup");
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("technical");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<InterviewReview | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 开始面试
  async function handleStart() {
    if (!resumeText.trim() || !jdText.trim()) {
      alert("请填写简历内容和目标岗位JD");
      return;
    }
    setLoading(true);
    try {
      const firstQuestion = await startInterview({
        resumeText: resumeText.trim(),
        jdText: jdText.trim(),
        type: interviewType,
      });
      setMessages([firstQuestion]);
      setStep("interview");
    } catch (err) {
      alert(err instanceof Error ? err.message : "开始面试失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  // 发送回复
  async function handleSend() {
    if (!userInput.trim() || loading) return;
    const input = userInput.trim();
    setUserInput("");

    // 添加用户回复到消息
    const userMessage: InterviewMessage = {
      role: "candidate",
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const nextQuestion = await replyInterview({
        history: messages,
        userReply: input,
      });
      setMessages((prev) => [...prev, nextQuestion]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "发送失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  // 结束面试
  async function handleEnd() {
    if (messages.length < 2) {
      alert("至少完成一轮对话才能结束面试");
      return;
    }
    if (!confirm("确定要结束本次面试吗？结束后将生成面试点评报告。")) return;
    setLoading(true);
    try {
      const reviewResult = await endInterview(messages);
      setReview(reviewResult);
      setStep("review");
    } catch (err) {
      alert(err instanceof Error ? err.message : "生成点评失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  // 重新开始
  function handleRestart() {
    setStep("setup");
    setMessages([]);
    setReview(null);
    setUserInput("");
  }

  // 复制点评
  async function copyReview() {
    if (!review) return;
    const text = `
# 模拟面试点评报告
## 整体评分：${review.overallScore}分

## 核心优势
${review.strengths.map(s => `- ${s}`).join("\n")}

## 待改进点
${review.improvements.map(i => `- ${i}`).join("\n")}

## 详细评价
${review.detailedReview}

## 参考回答示例
${review.sampleAnswers.map(a => `### 问题：${a.question}\n${a.sampleAnswer}`).join("\n\n")}
    `.trim();
    await navigator.clipboard.writeText(text);
  }

  // 下载点评
  function downloadReview() {
    if (!review) return;
    const text = `
# 模拟面试点评报告
## 整体评分：${review.overallScore}分

## 核心优势
${review.strengths.map(s => `- ${s}`).join("\n")}

## 待改进点
${review.improvements.map(i => `- ${i}`).join("\n")}

## 详细评价
${review.detailedReview}

## 参考回答示例
${review.sampleAnswers.map(a => `### 问题：${a.question}\n${a.sampleAnswer}`).join("\n\n")}
    `.trim();
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "模拟面试点评报告.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (step === "setup") {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <h3 className="text-xl font-semibold text-center">模拟面试设置</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">面试类型</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="technical"
                checked={interviewType === "technical"}
                onChange={(e) => setInterviewType(e.target.value as InterviewType)}
              />
              <span>技术面</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="hr"
                checked={interviewType === "hr"}
                onChange={(e) => setInterviewType(e.target.value as InterviewType)}
              />
              <span>HR 面</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">简历内容</label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="w-full rounded-md border px-3 py-2 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="请粘贴您的简历文本内容"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">目标岗位JD</label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            className="w-full rounded-md border px-3 py-2 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="请粘贴目标岗位的招聘要求（JD）"
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleStart}
            disabled={loading || !resumeText.trim() || !jdText.trim()}
            className="rounded-md bg-primary px-8 py-3 text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "准备中…" : "开始模拟面试"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "interview") {
    return (
      <div className="space-y-4 h-[600px] flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            模拟{interviewType === "technical" ? "技术面" : "HR面"}进行中
          </h3>
          <button
            onClick={handleEnd}
            disabled={loading || messages.length < 2}
            className="flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            <StopCircle className="h-4 w-4" />
            结束面试
          </button>
        </div>

        <div className="flex-1 overflow-auto rounded-md border p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "interviewer" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "interviewer"
                    ? "bg-muted text-foreground"
                    : "bg-primary text-white"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString("zh-CN")}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                <p className="text-sm">面试官正在思考…</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="请输入您的回答，按Enter发送"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !userInput.trim()}
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (step === "review" && review) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">面试点评报告</h3>
          <div className="flex gap-2">
            <button
              onClick={copyReview}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border hover:bg-muted"
            >
              <Copy className="h-4 w-4" />
              复制报告
            </button>
            <button
              onClick={downloadReview}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-green-50 text-green-700 hover:bg-green-100"
            >
              <Download className="h-4 w-4" />
              下载报告
            </button>
            <button
              onClick={handleRestart}
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90"
            >
              重新面试
            </button>
          </div>
        </div>

        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 text-center">
          <p className="text-sm text-yellow-800">整体评分</p>
          <p className="text-4xl font-bold text-yellow-700 mt-1">{review.overallScore} 分</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <ThumbsUp className="h-5 w-5" />
              核心优势
            </div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {review.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center gap-1 text-red-600 font-medium">
              <AlertTriangle className="h-5 w-5" />
              待改进点
            </div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {review.improvements.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-md border p-4 space-y-3">
          <h4 className="font-medium">详细评价</h4>
          <p className="text-sm whitespace-pre-wrap">{review.detailedReview}</p>
        </div>

        <div className="rounded-md border p-4 space-y-4">
          <h4 className="font-medium">参考回答示例</h4>
          {review.sampleAnswers.map((item, i) => (
            <div key={i} className="space-y-2">
              <p className="text-sm font-medium">问题：{item.question}</p>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm whitespace-pre-wrap">{item.sampleAnswer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
