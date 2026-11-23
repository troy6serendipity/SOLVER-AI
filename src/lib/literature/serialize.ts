import type { Paper } from "@prisma/client";
import type {
  PaperDetail,
  PaperListItem,
  PaperParagraph,
  TranslationCache,
} from "./types";

// Prisma 行 → API 响应结构：把 JSON 字符串字段解析为对象/数组。

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toPaperListItem(paper: Paper): PaperListItem {
  return {
    id: paper.id,
    title: paper.title,
    authors: paper.authors,
    tags: paper.tags,
    favorite: paper.favorite,
    pageCount: paper.pageCount,
    summary: paper.summary,
    filePath: paper.filePath,
    createdAt: paper.createdAt.toISOString(),
    updatedAt: paper.updatedAt.toISOString(),
  };
}

export function toPaperDetail(paper: Paper): PaperDetail {
  return {
    ...toPaperListItem(paper),
    abstract: paper.abstract,
    fullText: paper.fullText,
    paragraphs: safeJsonParse<PaperParagraph[]>(paper.paragraphs, []),
    translation: safeJsonParse<TranslationCache | null>(
      paper.translation,
      null
    ),
  };
}

export function parseTags(tags: string | null): string[] {
  return safeJsonParse<string[]>(tags, []);
}
