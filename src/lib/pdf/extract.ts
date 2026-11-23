// PDF 文本提取与段落切分（服务端专用）。
// 使用 pdf-parse v2（PDFParse class），动态 import 避免被客户端打包；
// 原生 @napi-rs/canvas 已在 next.config 中 externalize，纯文本提取不会加载它。

export interface PdfParagraph {
  index: number; // 1 起编号，供溯源问答引用
  text: string;
}

export interface PdfExtraction {
  fullText: string;
  paragraphs: PdfParagraph[];
  pageCount: number;
}

const MAX_PARAGRAPHS = 400;
const MIN_PARAGRAPH_CHARS = 2;

/**
 * 从 PDF Buffer 提取全文并按段落切分编号。
 * 遵循「最少清洗」原则：只统一换行、合并段内断行，不删除疑似页码/页眉。
 */
export async function extractPdf(buffer: Buffer): Promise<PdfExtraction> {
  // 动态加载，确保只在服务端路由中按需载入
  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({
    data: new Uint8Array(buffer),
  });

  try {
    // pageJoiner 置空，去掉库默认插入的 "-- N of M --" 页边界标记
    const result = await parser.getText({ pageJoiner: "" });
    const rawText = result.text ?? "";

    // 统一换行符，去掉零宽字符与多余空白行
    const normalized = rawText
      .replace(/\r\n?/g, "\n")
      .replace(/[\u200B\u00AD]/g, "")
      .trim();

    if (normalized.length < 20) {
      throw new PdfExtractError(
        "未从 PDF 中提取到有效文本，该文件可能是扫描件或受保护文档，请改用含文本层的 PDF。"
      );
    }

    const paragraphs = segmentParagraphs(normalized);
    if (paragraphs.length === 0) {
      throw new PdfExtractError("PDF 文本切分失败，未得到有效段落。");
    }

    return {
      fullText: normalized,
      paragraphs: paragraphs.slice(0, MAX_PARAGRAPHS),
      pageCount: result.total,
    };
  } finally {
    await parser.destroy();
  }
}

/**
 * 段落切分：
 * 1. 以空行（连续 2+ 换行）作为天然段落边界；
 * 2. 没有空行时，退化为按单换行切分；
 * 3. 段内被 PDF 排版折断的多行用空格合并；
 * 4. 过滤过短碎块，顺序编号。
 */
function segmentParagraphs(text: string): PdfParagraph[] {
  const blocks = text.includes("\n\n")
    ? text.split(/\n{2,}/)
    : text.split("\n");

  const paragraphs: PdfParagraph[] = [];
  let index = 1;

  for (const block of blocks) {
    const merged = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    if (merged.length < MIN_PARAGRAPH_CHARS) continue;
    paragraphs.push({ index: index++, text: merged });
  }

  return paragraphs;
}

export class PdfExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfExtractError";
  }
}
