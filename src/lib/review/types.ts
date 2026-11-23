// 复习助手前后端共享类型

export type Mastery = "new" | "learning" | "mastered";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WrongQuestionRecord {
  id: string;
  subject: string;
  question: string;
  answer: string | null;
  analysis: string | null;
  knowledgePoint: string | null;
  formulas: string | null;
  source: string | null;
  mastery: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WrongQuestionListResponse {
  records: WrongQuestionRecord[];
  tags: string[];
}

export interface SaveWrongPayload {
  question: string;
  analysis?: string;
  answer?: string;
  source: "manual" | "review" | "ocr";
}

export interface SaveWrongResponse extends Omit<WrongQuestionRecord, "formulas"> {
  // 服务端在原始记录（formulas 为 JSON 字符串）之外，额外返回解析后的数组
  formulas: string[];
  knowledgePoints: string[];
  extractedBy: string;
  mock: boolean;
}

export interface VariantResponse {
  question: string;
  model: string;
  mock: boolean;
}

export const MASTERY_LABELS: Record<Mastery, string> = {
  new: "待复习",
  learning: "复习中",
  mastered: "已掌握",
};

export const SOURCE_LABELS: Record<string, string> = {
  manual: "手动录入",
  review: "解题对话",
  ocr: "图片识别",
};
