"use client";

import { useState } from "react";
import { ResumeOptimizeTab } from "@/components/career/resume-optimize-tab";
import { JobMatchTab } from "@/components/career/job-match-tab";
import { MockInterviewTab } from "@/components/career/mock-interview-tab";
import { KanbanTab } from "@/components/career/kanban-tab";

// 求职助手：简历优化 + 岗位匹配 + AI模拟面试 + 求职进度看板
// 鉴权与 force-dynamic 由 (dashboard)/layout.tsx 统一保证。
export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<string>("resume");

  const tabs = [
    { id: "resume", label: "简历优化" },
    { id: "match", label: "岗位匹配" },
    { id: "interview", label: "AI 模拟面试" },
    { id: "kanban", label: "求职进度看板" },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">求职助手</h1>
        <p className="text-muted-foreground">
          一站式求职工具：AI 简历优化、多岗位匹配度评估、模拟面试练习、求职进度全流程管理。
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "resume" && <ResumeOptimizeTab />}
      {activeTab === "match" && <JobMatchTab />}
      {activeTab === "interview" && <MockInterviewTab />}
      {activeTab === "kanban" && <KanbanTab />}
    </div>
  );
}
