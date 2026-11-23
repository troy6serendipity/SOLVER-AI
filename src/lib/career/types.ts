// 求职助手类型定义

export type JobStatus = "pending" | "applied" | "written_test" | "interview" | "offer" | "rejected";

// 求职进度看板项
export interface JobApplication {
  id: string;
  company: string;
  position: string;
  status: JobStatus;
  interviewTime: string | null;
  salary: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// 简历优化请求
export interface ResumeOptimizeRequest {
  resumeText: string;
  jdText: string;
}

// 简历优化建议项
export interface ResumeSuggestion {
  original: string;
  optimized: string;
  reason: string;
  type: "experience" | "skill" | "project" | "format" | "other";
}

// 简历优化响应
export interface ResumeOptimizeResponse {
  suggestions: ResumeSuggestion[];
  overallScore: number;
  overallAdvice: string;
  optimizedFullText: string;
}

// 岗位匹配请求
export interface JobMatchRequest {
  resumeText: string;
  jobs: Array<{
    jobName: string;
    jdText: string;
  }>;
}

// 岗位匹配结果项
export interface JobMatchResult {
  jobName: string;
  experienceScore: number;
  skillScore: number;
  fitScore: number;
  totalScore: number;
  rank: number;
  strengths: string[];
  weaknesses: string[];
}

// 模拟面试类型
export type InterviewType = "technical" | "hr";

// 模拟面试消息
export interface InterviewMessage {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
}

// 模拟面试开始请求
export interface InterviewStartRequest {
  resumeText: string;
  jdText: string;
  type: InterviewType;
}

// 模拟面试回复请求
export interface InterviewReplyRequest {
  history: InterviewMessage[];
  userReply: string;
}

// 面试点评响应
export interface InterviewReview {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  detailedReview: string;
  sampleAnswers: Array<{
    question: string;
    sampleAnswer: string;
  }>;
}
