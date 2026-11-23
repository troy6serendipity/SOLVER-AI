"use client";

import { useState } from "react";
import { Plus, Trash2, Award, AlertTriangle } from "lucide-react";
import { matchJobs } from "@/lib/career/client-api";
import type { JobMatchResult } from "@/lib/career/types";

interface JobInput {
  id: string;
  jobName: string;
  jdText: string;
}

export function JobMatchTab() {
  const [resumeText, setResumeText] = useState("");
  const [jobs, setJobs] = useState<JobInput[]>([
    { id: "1", jobName: "", jdText: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<JobMatchResult[] | null>(null);

  // 添加岗位
  function addJob() {
    setJobs([...jobs, { id: Date.now().toString(), jobName: "", jdText: "" }]);
  }

  // 删除岗位
  function removeJob(id: string) {
    if (jobs.length <= 1) return;
    setJobs(jobs.filter((job) => job.id !== id));
  }

  // 更新岗位信息
  function updateJob(id: string, field: "jobName" | "jdText", value: string) {
    setJobs(jobs.map((job) => (job.id === id ? { ...job, [field]: value } : job)));
  }

  async function handleMatch() {
    if (!resumeText.trim()) {
      alert("请填写简历内容");
      return;
    }
    for (const job of jobs) {
      if (!job.jobName.trim() || !job.jdText.trim()) {
        alert("请填写所有岗位的名称和JD内容");
        return;
      }
    }

    setLoading(true);
    try {
      const matches = await matchJobs({
        resumeText: resumeText.trim(),
        jobs: jobs.map((job) => ({
          jobName: job.jobName.trim(),
          jdText: job.jdText.trim(),
        })),
      });
      setResults(matches);
    } catch (err) {
      alert(err instanceof Error ? err.message : "匹配失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  // 获取分数对应的颜色
  function getScoreColor(score: number) {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">简历内容</label>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          className="w-full rounded-md border px-3 py-2 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="请粘贴您的简历文本内容"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">目标岗位（最多可添加5个）</label>
          <button
            onClick={addJob}
            disabled={jobs.length >= 5}
            className="flex items-center gap-1 text-sm text-primary hover:underline disabled:text-muted-foreground"
          >
            <Plus className="h-4 w-4" /> 添加岗位
          </button>
        </div>

        {jobs.map((job, index) => (
          <div key={job.id} className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">岗位 {index + 1}</h4>
              <button
                onClick={() => removeJob(job.id)}
                disabled={jobs.length <= 1}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={job.jobName}
              onChange={(e) => updateJob(job.id, "jobName", e.target.value)}
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="岗位名称（如：前端开发工程师）"
            />
            <textarea
              value={job.jdText}
              onChange={(e) => updateJob(job.id, "jdText", e.target.value)}
              className="w-full rounded-md border px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="请粘贴该岗位的招聘要求（JD）"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleMatch}
          disabled={loading || !resumeText.trim() || jobs.length === 0}
          className="rounded-md bg-primary px-6 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "匹配中…" : "开始岗位匹配"}
        </button>
      </div>

      {results && (
        <div className="space-y-6 pt-6 border-t">
          <h3 className="text-lg font-semibold">匹配结果（按总分降序）</h3>

          <div className="space-y-6">
            {results.map((result) => (
              <div key={result.rank} className="rounded-md border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold">
                      {result.rank}
                    </span>
                    <h4 className="text-lg font-semibold">{result.jobName}</h4>
                    <span className={`text-2xl font-bold ${getScoreColor(result.totalScore)}`}>
                      {result.totalScore} 分
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">经历匹配</p>
                    <p className={`text-xl font-bold mt-1 ${getScoreColor(result.experienceScore)}`}>
                      {result.experienceScore}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">技能匹配</p>
                    <p className={`text-xl font-bold mt-1 ${getScoreColor(result.skillScore)}`}>
                      {result.skillScore}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">岗位契合度</p>
                    <p className={`text-xl font-bold mt-1 ${getScoreColor(result.fitScore)}`}>
                      {result.fitScore}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-green-600 font-medium text-sm">
                      <Award className="h-4 w-4" /> 核心优势
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {result.strengths.map((strength, i) => (
                        <li key={i}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-red-600 font-medium text-sm">
                      <AlertTriangle className="h-4 w-4" /> 待提升点
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {result.weaknesses.map((weakness, i) => (
                        <li key={i}>{weakness}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
