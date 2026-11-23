// 文献阅读助手前后端共享类型

export interface PaperParagraph {
  index: number;
  text: string;
}

export interface SummaryCards {
  background: string;
  methods: string;
  results: string;
  limitations: string;
}

export interface TranslationCache {
  zh?: string;
  en?: string;
}

/** 列表项（不含全文与段落，保持轻量） */
export interface PaperListItem {
  id: string;
  title: string;
  authors: string | null;
  tags: string | null;
  favorite: boolean;
  pageCount: number | null;
  summary: string | null;
  filePath: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 详情（含段落与速读卡） */
export interface PaperDetail extends PaperListItem {
  abstract: string | null;
  fullText: string | null;
  paragraphs: PaperParagraph[];
  translation: TranslationCache | null;
}

export interface PaperListResponse {
  records: PaperListItem[];
  tags: string[];
}

export interface AskPayload {
  question: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface TranslatePayload {
  target: "zh" | "en";
}

export interface TagUpdatePayload {
  tags: string[];
}
